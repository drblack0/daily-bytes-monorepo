package main

import (
	"context"
	"daily-bytes/internal/db"
	"daily-bytes/internal/handlers"
	"daily-bytes/internal/repository"
	"log"
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

func main() {
	mongoConfig, err := db.ConnectMongo()

	if err != nil {
		log.Fatalf("Database initialization failed: %v", err)
	}

	defer func() {
		if err := mongoConfig.Client.Disconnect(context.Background()); err != nil {
			log.Printf("Error disconnecting: %v", err)
		}
	}()

	// 2. Initialize Repository and Handlers
	articleRepo := repository.NewArticleRepository(mongoConfig.Database, "articles")
	substackInsightRepo := repository.NewSubstackInsightsRepository(mongoConfig.Database)
	substackHandler := &handlers.SubstackHandler{ArticleRepo: articleRepo, InsightRepo: substackInsightRepo}

	e := echo.New()
	e.Use(middleware.RequestLogger())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:3000"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))
	e.GET("/", helloWorld)

	e.POST("/upload-substack", substackHandler.UploadSubstackHandler)
	e.GET("/insights", substackHandler.GetInsightsHandler)
	if err := e.Start(":8080"); err != nil {
		e.Logger.Error("failed to start server", "error", err)
	}

}

func helloWorld(c *echo.Context) error {
	return c.String(http.StatusOK, "hello world")
}
