package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type SubstackArticle struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Title     string             `bson:"title" json:"title"`
	Author    string             `bson:"author" json:"author"`
	MainText  string             `bson:"main_text" json:"main_text"`
	URL       string             `bson:"url" json:"url"`
	ScrapedAt primitive.DateTime `bson:"scraped_at" json:"scraped_at"`
}
