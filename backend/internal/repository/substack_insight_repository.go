package repository

import (
	"context"
	"daily-bytes/internal/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type SubstackInsightsRepository struct {
	Collection *mongo.Collection
}

func NewSubstackInsightsRepository(db *mongo.Database) *SubstackInsightsRepository {
	return &SubstackInsightsRepository{
		Collection: db.Collection("substack_insights"),
	}
}

// Create
func (r *SubstackInsightsRepository) Create(ctx context.Context, article *models.SubstackInsight) error {
	article.GeneratedAt = primitive.NewDateTimeFromTime(time.Now())
	_, err := r.Collection.InsertOne(ctx, article)
	return err
}

// GetByID
func (r *SubstackInsightsRepository) GetByID(ctx context.Context, id string) (*models.SubstackInsight, error) {
	objID, _ := primitive.ObjectIDFromHex(id)
	var article models.SubstackInsight
	err := r.Collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&article)
	return &article, err
}

// GetAll
func (r *SubstackInsightsRepository) GetAll(ctx context.Context) ([]models.SubstackInsight, error) {
	cursor, err := r.Collection.Find(ctx, bson.D{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var articles []models.SubstackInsight
	if err = cursor.All(ctx, &articles); err != nil {
		return nil, err
	}
	return articles, nil
}

// Update
// TODO
func (r *SubstackInsightsRepository) Update(ctx context.Context, id string, article *models.SubstackInsight) error {
	objID, _ := primitive.ObjectIDFromHex(id)
	update := bson.M{
		"$set": "",
	}
	_, err := r.Collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

// Delete
func (r *SubstackInsightsRepository) Delete(ctx context.Context, id string) error {
	objID, _ := primitive.ObjectIDFromHex(id)
	_, err := r.Collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}
