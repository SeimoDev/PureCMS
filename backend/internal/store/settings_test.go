package store

import (
	"reflect"
	"testing"
)

func TestSettingsMutationsDeleteNullValues(t *testing.T) {
	input := map[string]any{
		"site":   map[string]any{"title": "PureCMS"},
		"legacy": nil,
		"   ":    "ignored",
	}

	upserts, deletes := settingsMutations(input)

	wantUpserts := map[string]any{
		"site": map[string]any{"title": "PureCMS"},
	}
	if !reflect.DeepEqual(upserts, wantUpserts) {
		t.Fatalf("upserts = %#v, want %#v", upserts, wantUpserts)
	}
	if !reflect.DeepEqual(deletes, []string{"legacy"}) {
		t.Fatalf("deletes = %#v, want [legacy]", deletes)
	}
}
