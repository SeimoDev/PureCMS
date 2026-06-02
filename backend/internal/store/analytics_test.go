package store

import (
	"testing"
	"time"
)

func TestViewDayInLocationUsesSiteLocalDate(t *testing.T) {
	utcTime := time.Date(2026, 5, 31, 16, 30, 0, 0, time.UTC)
	location := time.FixedZone("Asia/Shanghai", 8*60*60)

	got := ViewDayInLocation(utcTime, location)
	want := "2026-06-01"

	if got != want {
		t.Fatalf("ViewDayInLocation() = %q, want %q", got, want)
	}
}

func TestViewDayInLocationFallsBackToUTC(t *testing.T) {
	utcTime := time.Date(2026, 5, 31, 23, 30, 0, 0, time.UTC)

	got := ViewDayInLocation(utcTime, nil)
	want := "2026-05-31"

	if got != want {
		t.Fatalf("ViewDayInLocation() = %q, want %q", got, want)
	}
}
