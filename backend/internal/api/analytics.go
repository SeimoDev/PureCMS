package api

import "net/http"

func (s Server) analytics(w http.ResponseWriter, r *http.Request) {
	summary, err := s.store.Analytics(r.Context(), parseInt(r.URL.Query().Get("days"), 14))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "读取访问统计失败")
		return
	}
	writeJSON(w, http.StatusOK, summary)
}
