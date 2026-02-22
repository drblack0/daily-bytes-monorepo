package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type SubstackInsight struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Insight      string             `bson:"insight" json:"insight"`
	ActionToTake string             `bson:"action_to_take" json:"action_to_take"`
	URL          string             `bson:"url" json:"url"`
	GeneratedAt  primitive.DateTime `bson:"scraped_at" json:"scraped_at"`
}
