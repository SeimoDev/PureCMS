package api

import (
	"net/http"

	"purecms/backend/internal/models"

	"github.com/go-chi/chi/v5"
)

func (s Server) listPublicFriendLinks(w http.ResponseWriter, r *http.Request) {
	links, err := s.store.ListFriendLinks(r.Context(), false)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取友链失败")
		return
	}
	writeJSON(w, http.StatusOK, links)
}

func (s Server) listAdminFriendLinks(w http.ResponseWriter, r *http.Request) {
	links, err := s.store.ListFriendLinks(r.Context(), true)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取友链失败")
		return
	}
	writeJSON(w, http.StatusOK, links)
}

func (s Server) createFriendLink(w http.ResponseWriter, r *http.Request) {
	var input models.FriendLinkInput
	if !decodeJSON(w, r, &input) {
		return
	}
	link, err := s.store.CreateFriendLink(r.Context(), input)
	if err != nil {
		writeStoreError(w, err, "创建友链失败")
		return
	}
	s.logAdminAction(r, "create", "friend_link", link.ID, map[string]any{"name": link.Name, "url": link.URL})
	writeJSON(w, http.StatusCreated, link)
}

func (s Server) updateFriendLink(w http.ResponseWriter, r *http.Request) {
	var input models.FriendLinkInput
	if !decodeJSON(w, r, &input) {
		return
	}
	link, err := s.store.UpdateFriendLink(r.Context(), chi.URLParam(r, "id"), input)
	if err != nil {
		writeStoreError(w, err, "更新友链失败")
		return
	}
	s.logAdminAction(r, "update", "friend_link", link.ID, map[string]any{"name": link.Name, "status": link.Status})
	writeJSON(w, http.StatusOK, link)
}

func (s Server) deleteFriendLink(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.store.DeleteFriendLink(r.Context(), id); err != nil {
		writeStoreError(w, err, "删除友链失败")
		return
	}
	s.logAdminAction(r, "delete", "friend_link", id, nil)
	w.WriteHeader(http.StatusNoContent)
}
