package store

import (
	"strings"
	"testing"
)

func TestTaxonomyReferenceCountSQLCountsActiveContentRelations(t *testing.T) {
	got := taxonomyReferenceCountSQL("post_categories", "category_id")

	for _, want := range []string{
		"FROM post_categories rel",
		"JOIN posts p ON p.id=rel.post_id",
		"rel.category_id=$1",
		"p.deleted_at IS NULL",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("taxonomyReferenceCountSQL() = %q, want fragment %q", got, want)
		}
	}
}

func TestTaxonomyInUseErrorIncludesKindAndCount(t *testing.T) {
	err := TaxonomyInUseError{Kind: "category", Count: 3}

	if err.Error() != "taxonomy category is in use" {
		t.Fatalf("Error() = %q, want taxonomy category is in use", err.Error())
	}
	if err.Count != 3 {
		t.Fatalf("Count = %d, want 3", err.Count)
	}
}
