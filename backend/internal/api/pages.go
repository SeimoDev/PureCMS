package api

import (
	"net/http"
	"strings"

	"purecms/backend/internal/models"

	"github.com/go-chi/chi/v5"
)

func (s Server) listPublicPages(w http.ResponseWriter, r *http.Request) {
	pages, err := s.store.ListPages(r.Context(), models.PageFilter{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取页面失败")
		return
	}
	writeJSON(w, http.StatusOK, pages)
}

func (s Server) getPublicPage(w http.ResponseWriter, r *http.Request) {
	page, err := s.store.GetPageBySlug(r.Context(), chi.URLParam(r, "slug"), false)
	if err != nil {
		writeStoreError(w, err, "页面不存在")
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (s Server) listAdminPages(w http.ResponseWriter, r *http.Request) {
	filter := adminPageFilterFromQuery(r)
	if wantsPaginatedPagesResponse(r) {
		page, err := s.store.ListPagesPage(r.Context(), filter)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "读取页面失败")
			return
		}
		writeJSON(w, http.StatusOK, page)
		return
	}
	if r.URL.Query().Get("limit") == "" {
		filter.Limit = 0
		filter.Offset = 0
	}
	pages, err := s.store.ListPages(r.Context(), filter)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取页面失败")
		return
	}
	writeJSON(w, http.StatusOK, pages)
}

func adminPageFilterFromQuery(r *http.Request) models.PageFilter {
	query := r.URL.Query()
	limit := parseInt(query.Get("limit"), 10)
	offset := parseInt(query.Get("offset"), 0)
	if query.Get("offset") == "" {
		page := parseInt(query.Get("page"), 0)
		if page > 1 {
			offset = (page - 1) * limit
		}
	}
	return models.PageFilter{
		Admin:   true,
		Deleted: parseBool(query.Get("deleted")),
		Query:   strings.TrimSpace(query.Get("q")),
		Status:  strings.TrimSpace(query.Get("status")),
		Nav:     strings.TrimSpace(query.Get("nav")),
		Limit:   limit,
		Offset:  offset,
	}
}

func wantsPaginatedPagesResponse(r *http.Request) bool {
	query := r.URL.Query()
	return parseBool(query.Get("paged")) || strings.TrimSpace(query.Get("page")) != ""
}

func (s Server) getAdminPage(w http.ResponseWriter, r *http.Request) {
	page, err := s.store.GetPageByID(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeStoreError(w, err, "页面不存在")
		return
	}
	writeJSON(w, http.StatusOK, page)
}

func (s Server) createPage(w http.ResponseWriter, r *http.Request) {
	var input models.PageInput
	if !decodeJSON(w, r, &input) {
		return
	}
	page, err := s.store.CreatePage(r.Context(), input)
	if err != nil {
		writeStoreError(w, err, "创建页面失败")
		return
	}
	s.logAdminAction(r, "create", "page", page.ID, map[string]any{"title": page.Title, "status": page.Status})
	writeJSON(w, http.StatusCreated, page)
}

func (s Server) updatePage(w http.ResponseWriter, r *http.Request) {
	var input models.PageInput
	if !decodeJSON(w, r, &input) {
		return
	}
	actorID := ""
	if claims := claimsFromContext(r.Context()); claims != nil {
		actorID = claims.UserID
	}
	page, err := s.store.UpdatePage(r.Context(), chi.URLParam(r, "id"), input, actorID)
	if err != nil {
		writeStoreError(w, err, "更新页面失败")
		return
	}
	s.logAdminAction(r, "update", "page", page.ID, map[string]any{"title": page.Title, "status": page.Status})
	writeJSON(w, http.StatusOK, page)
}

func (s Server) deletePage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.DeletePage(r.Context(), id); err != nil {
		writeStoreError(w, err, "删除页面失败")
		return
	}
	s.logAdminAction(r, "trash", "page", id, nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) restorePage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.RestorePage(r.Context(), id); err != nil {
		writeStoreError(w, err, "恢复页面失败")
		return
	}
	s.logAdminAction(r, "restore", "page", id, nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) permanentlyDeletePage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.PermanentlyDeletePage(r.Context(), id); err != nil {
		writeStoreError(w, err, "彻底删除页面失败")
		return
	}
	s.logAdminAction(r, "delete_permanent", "page", id, nil)
	w.WriteHeader(http.StatusNoContent)
}

func (s Server) listPageRevisions(w http.ResponseWriter, r *http.Request) {
	revisions, err := s.store.ListPageRevisions(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取页面版本失败")
		return
	}
	writeJSON(w, http.StatusOK, revisions)
}

func (s Server) restorePageRevision(w http.ResponseWriter, r *http.Request) {
	actorID := ""
	if claims := claimsFromContext(r.Context()); claims != nil {
		actorID = claims.UserID
	}
	page, err := s.store.RestorePageRevision(r.Context(), chi.URLParam(r, "id"), chi.URLParam(r, "revisionId"), actorID)
	if err != nil {
		writeStoreError(w, err, "恢复页面版本失败")
		return
	}
	s.logAdminAction(r, "restore", "page", page.ID, revisionRestoreLogDetail(page.Title, chi.URLParam(r, "revisionId")))
	writeJSON(w, http.StatusOK, page)
}
