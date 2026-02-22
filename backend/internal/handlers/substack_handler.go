package handlers

import (
	"context"
	"daily-bytes/internal/models"
	"daily-bytes/internal/repository"
	"daily-bytes/internal/services"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/net/html"
)

type SubstackHandler struct {
	ArticleRepo *repository.ArticleRepository
	InsightRepo *repository.SubstackInsightsRepository
}

type UploadSubStackRequest struct {
	URL string `json:"url"`
}

func (h *SubstackHandler) UploadSubstackHandler(c *echo.Context) error {
	req := new(UploadSubStackRequest)
	if err := c.Bind(req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	// 1. Scrape the content
	resp, err := http.Get(req.URL)
	if err != nil || resp.StatusCode != 200 {
		return echo.NewHTTPError(http.StatusServiceUnavailable, "Failed to fetch URL")
	}
	defer resp.Body.Close()

	doc, err := html.Parse(resp.Body)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to parse HTML")
	}
	extractedText := getData(doc)

	article := &models.SubstackArticle{
		Title:    "Scraped Article",
		URL:      req.URL,
		MainText: extractedText,
	}

	// 2. Generate Insights via Gemini
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second) // Longer timeout for AI
	defer cancel()

	if err := h.ArticleRepo.Create(ctx, article); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save to database")
	}
	// Assuming GeminiClient is available in your handler struct or passed in
	gc := services.NewGeminiClient(ctx)

	aiResponse, err := gc.CreateInsights(ctx, extractedText)
	if err != nil {
		fmt.Println("here is the error: ", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "AI Generation failed")
	}

	// 3. Convert AI results to your Mongo Model
	var finalInsights []models.SubstackInsight
	for _, item := range aiResponse.InsightsList {
		insightModel := models.SubstackInsight{
			ID:           primitive.NewObjectID(),
			Insight:      item.Insight,
			ActionToTake: item.ActionToTake,
			URL:          req.URL,
			GeneratedAt:  primitive.NewDateTimeFromTime(time.Now()),
		}

		// 4. Store each in MongoDB (or use a BulkWrite if your repo supports it)
		if err := h.InsightRepo.Create(ctx, &insightModel); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save insight")
		}
		finalInsights = append(finalInsights, insightModel)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":  "Insights generated and saved",
		"count":    len(finalInsights),
		"insights": finalInsights,
	})
}

func (h *SubstackHandler) GetInsightsHandler(c *echo.Context) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	insights, err := h.InsightRepo.GetAll(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch insights")
	}

	if insights == nil {
		insights = []models.SubstackInsight{}
	}

	return c.JSON(http.StatusOK, insights)
}

func getData(n *html.Node) string {
	var res string
	if n.Type == html.TextNode && n.Parent != nil && n.Parent.Data == "p" {
		res += n.Data + "\n"
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		res += getData(c)
	}
	return res
}
