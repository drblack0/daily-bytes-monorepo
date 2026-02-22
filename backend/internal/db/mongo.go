package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Config holds the database connection details
type Config struct {
	Client   *mongo.Client
	Database *mongo.Database
}

// ConnectMongo initializes the environment and connects to the database
func ConnectMongo() (*Config, error) {
	// 1. Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, proceeding with system environment variables")
	}

	uri := os.Getenv("DB_URI")
	dbName := os.Getenv("DB_NAME")

	if uri == "" || dbName == "" {
		return nil, fmt.Errorf("MONGO_URI or DB_NAME not set in environment")
	}

	// 2. Set up client options and connect
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to mongo: %w", err)
	}

	// 3. Ping the database to verify connectivity
	if err := client.Ping(ctx, nil); err != nil {
		return nil, fmt.Errorf("failed to ping mongo: %w", err)
	}

	fmt.Printf("Successfully connected to MongoDB database: %s\n", dbName)

	return &Config{
		Client:   client,
		Database: client.Database(dbName),
	}, nil
}
