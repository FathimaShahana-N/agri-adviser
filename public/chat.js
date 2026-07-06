(function () {
  const chat = document.getElementById("chat");
  const form = document.getElementById("chat-form");
  const textInput = document.getElementById("text-input");
  const imageInput = document.getElementById("image-input");
  const fileNameLabel = document.getElementById("file-name");
  const locationInput = document.getElementById("location-input");
  const cropSelect = document.getElementById("crop-select");
  const growthStageSelect = document.getElementById("growth-stage-select");
  const traceOutput = document.getElementById("trace-output");

  const SESSION_KEY = "agriadvisor_session_id";
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  imageInput.addEventListener("change", () => {
    fileNameLabel.textContent = imageInput.files[0] ? imageInput.files[0].name : "Attach photo";
  });

  function appendMessage(text, role, langBadge) {
    const el = document.createElement("div");
    el.className = "msg " + role;
    if (langBadge) {
      const badge = document.createElement("span");
      badge.className = "lang-badge";
      badge.textContent = langBadge;
      el.appendChild(badge);
      el.appendChild(document.createElement("br"));
    }
    el.appendChild(document.createTextNode(text));
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    const file = imageInput.files[0];
    const location = locationInput.value.trim();
    const growthStage = growthStageSelect.value;
    const selectedCrop = cropSelect.value;

    // A growth-stage tip request can stand entirely on its own (no text or
    // photo needed) - only block empty submissions that have nothing at all.
    if (!text && !file && !growthStage) {
      appendMessage("Please type a description, attach a photo, or pick a growth stage for a tip.", "system");
      return;
    }

    appendMessage(text || (file ? "(photo only)" : "(growth stage tip request)"), "farmer");

    const formData = new FormData();
    formData.append("sessionId", sessionId);
    if (text) formData.append("text", text);
    if (file) formData.append("image", file);
    if (location) formData.append("locationName", location);
    if (growthStage) formData.append("growthStage", growthStage);
    if (selectedCrop) formData.append("selectedCrop", selectedCrop);

    const submitButton = form.querySelector("button[type=submit]");
    submitButton.disabled = true;

    try {
      const res = await fetch("/api/chat", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        appendMessage("Error: " + (data.error || "request failed"), "system");
        return;
      }

      // Response Agent (Agent 4) composes diagnosis + weather into this one
      // message - it's the only thing shown in the chat itself. Full
      // diagnosis/weather/agent reasoning is still available in the trace
      // panel below for inspection/demo purposes.
      appendMessage(data.message, "assistant", data.language ? data.language.name : null);

      traceOutput.textContent = (data.trace || [])
        .map((t) => `[${t.timestamp}] (${t.agent}) ${t.decision} — ${t.reasoning}`)
        .join("\n");
    } catch (err) {
      appendMessage("Network error: could not reach AgriAdvisor.", "system");
    } finally {
      submitButton.disabled = false;
      textInput.value = "";
      imageInput.value = "";
      fileNameLabel.textContent = "Attach photo";
    }
  });
})();
