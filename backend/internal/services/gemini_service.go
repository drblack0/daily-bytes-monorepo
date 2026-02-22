package services

import (
	"context"
	"daily-bytes/internal/services/prompts"
	"encoding/json"
	"log"
	"os"

	"google.golang.org/genai"
)

type GeminiClient struct {
	Client *genai.Client
}

type ActionableResponse struct {
	ArticleSummary string `json:"article_summary"`
	Insights       []struct {
		Point        string `json:"point"`
		Significance string `json:"significance"`
	} `json:"insights"`
	Actions []struct {
		Task        string `json:"task"`
		Priority    string `json:"priority"`
		Description string `json:"description"`
	} `json:"actions"`
}

func NewGeminiClient(ctx context.Context) *GeminiClient {
	apiKey := os.Getenv("GEMINI_API_KEY")
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})

	if err != nil {
		return nil
	}

	return &GeminiClient{
		Client: client,
	}
}

func (gc *GeminiClient) Generate(ctx context.Context, config *genai.GenerateContentConfig, prompt string) string {
	result, err := gc.Client.Models.GenerateContent(ctx, "gemini-2.5-flash", genai.Text(prompt), config)
	if err != nil {
		log.Fatal(err)
	}
	return result.Candidates[0].Content.Parts[0].Text
}

// CreateJson forces the model to return valid JSON and handles the config setup
func (gc *GeminiClient) CreateJson(ctx context.Context, prompt string) (*ActionableResponse, error) {
	// Set the ResponseMimeType to application/json to enable JSON Mode
	config := &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
	}

	result, err := gc.Client.Models.GenerateContent(ctx, "gemini-2.0-flash", genai.Text(prompt), config)
	if err != nil {
		return nil, err
	}

	// Extract the raw text
	rawJson := result.Candidates[0].Content.Parts[0].Text

	// Unmarshal into our Go struct
	var response ActionableResponse
	err = json.Unmarshal([]byte(rawJson), &response)
	if err != nil {
		log.Printf("Failed to unmarshal JSON: %v", err)
		return nil, err
	}

	return &response, nil
}

type GeminiInsightResponse struct {
	InsightsList []struct {
		Insight      string `json:"insight"`
		ActionToTake string `json:"action_to_take"`
	} `json:"insights_list"`
}

func (gc *GeminiClient) CreateInsights(ctx context.Context, text string) (*GeminiInsightResponse, error) {
	prompt := prompts.INSIGHT_PROMPT + text

	config := &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
	}

	result, err := gc.Client.Models.GenerateContent(ctx, "gemini-2.5-flash", genai.Text(prompt), config)
	if err != nil {
		return nil, err
	}

	var response GeminiInsightResponse
	if err := json.Unmarshal([]byte(result.Candidates[0].Content.Parts[0].Text), &response); err != nil {
		return nil, err
	}

	return &response, nil
}
