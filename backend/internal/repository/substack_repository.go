package repository

import (
	"context"
	"daily-bytes/internal/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type ArticleRepository struct {
	Collection *mongo.Collection
}

func NewArticleRepository(db *mongo.Database, collectionName string) *ArticleRepository {
	return &ArticleRepository{
		Collection: db.Collection(collectionName),
	}
}

// Create
func (r *ArticleRepository) Create(ctx context.Context, article *models.SubstackArticle) error {
	article.ScrapedAt = primitive.NewDateTimeFromTime(time.Now())
	_, err := r.Collection.InsertOne(ctx, article)
	return err
}

// GetByID
func (r *ArticleRepository) GetByID(ctx context.Context, id string) (*models.SubstackArticle, error) {
	objID, _ := primitive.ObjectIDFromHex(id)
	var article models.SubstackArticle
	err := r.Collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&article)
	return &article, err
}

// GetAll
func (r *ArticleRepository) GetAll(ctx context.Context) ([]models.SubstackArticle, error) {
	cursor, err := r.Collection.Find(ctx, bson.D{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var articles []models.SubstackArticle
	if err = cursor.All(ctx, &articles); err != nil {
		return nil, err
	}
	return articles, nil
}

// Update
func (r *ArticleRepository) Update(ctx context.Context, id string, article *models.SubstackArticle) error {
	objID, _ := primitive.ObjectIDFromHex(id)
	update := bson.M{
		"$set": bson.M{
			"title":     article.Title,
			"main_text": article.MainText,
			"author":    article.Author,
		},
	}
	_, err := r.Collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	return err
}

// Delete
func (r *ArticleRepository) Delete(ctx context.Context, id string) error {
	objID, _ := primitive.ObjectIDFromHex(id)
	_, err := r.Collection.DeleteOne(ctx, bson.M{"_id": objID})
	return err
}
