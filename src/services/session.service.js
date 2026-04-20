const sessions = new Map();

export const getHistory = (sessionId) => {
  return sessions.get(sessionId) || [];
};

export const appendMessage = (sessionId, role, content) => {
  const history = sessions.get(sessionId) || [];
  history.push({ role, content });
  sessions.set(sessionId, history.slice(-12));
};

export const formatHistory = (history) => {
  if (!history || history.length === 0) return "No previous messages.";
  return history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
};

export const clearSession = (sessionId) => {
  sessions.delete(sessionId);
};
