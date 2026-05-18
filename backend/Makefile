.PHONY: run build test clean deps

APP_NAME = panella-api
ENTRY_POINT = cmd/api/main.go

run:
	go run $(ENTRY_POINT)

build:
	go build -o bin/$(APP_NAME) $(ENTRY_POINT)

test:
	go test -v ./...

clean:
	rm -rf bin/

deps:
	go mod tidy
	go mod download
