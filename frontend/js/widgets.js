    // ─── FAB Actions (WhatsApp / Support) ─────────────────────────────────────────
    function toggleSupportMenu() {
      document.getElementById('supportMenu').classList.toggle('active');
    }

    // ─── AI Chatbot Widget Logic ──────────────────────────────────────────────────
    function toggleChatbotWidget() {
      document.getElementById('chatbotWidget').classList.toggle('active');
    }

    function clearChatbotMessages() {
      const container = document.getElementById('chatbotMessages');
      container.innerHTML = `
        <div class="chat-message ai">
            <div class="avatar">🤖</div>
            <div class="message-content">تمت إعادة تعيين المحادثة. كيف أستطيع خدمتك الآن؟</div>
        </div>
    `;
    }

    function handleChatbotKeypress(e) {
      if (e.key === 'Enter') {
        sendChatbotMessage();
      }
    }

    function sendChatbotMessage() {
      const input = document.getElementById('chatbotInput');
      const text = input.value.trim();
      if (!text || chatbotTyping) return;

      input.value = '';
      const container = document.getElementById('chatbotMessages');

      const userMsg = document.createElement('div');
      userMsg.className = 'chat-message user';
      userMsg.innerHTML = `
        <div class="avatar">👤</div>
        <div class="message-content">${escapeHTML(text)}</div>
    `;
      container.appendChild(userMsg);
      container.scrollTop = container.scrollHeight;

      chatbotTyping = true;
      const botMsg = document.createElement('div');
      botMsg.className = 'chat-message ai';
      botMsg.innerHTML = `
        <div class="avatar">🤖</div>
        <div class="message-content typing">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
      container.appendChild(botMsg);
      container.scrollTop = container.scrollHeight;

      setTimeout(() => {
        const responseText = getSimulatedBotResponse(text);
        const uniqueId = 'bot-msg-' + Date.now();

        botMsg.innerHTML = `
            <div class="avatar">🤖</div>
            <div class="message-content" id="${uniqueId}">
                ${responseText}
                <div class="ai-message-actions">
                    <button onclick="rateBotMessage('${uniqueId}', true)" title="مفيد"><i class="fas fa-thumbs-up"></i></button>
                    <button onclick="rateBotMessage('${uniqueId}', false)" title="غير مفيد"><i class="fas fa-thumbs-down"></i></button>
                </div>
            </div>
        `;
        container.scrollTop = container.scrollHeight;
        chatbotTyping = false;
      }, 1500);
    }

    function getSimulatedBotResponse(q) {
      q = q.toLowerCase();
      if (q.includes('بلومبي') || q.includes('سباك') || q.includes('plumber')) {
        return "بالتأكيد! لدينا سباكون (Plumbers) معتمدون في دليل الحرفيين. يمكنك الانتقال إلى علامة التبويب 'الحرفيون' واختيار 'سباك' في خيار تصفية المهنة.";
      }
      if (q.includes('كهرباء') || q.includes('تريسيان') || q.includes('electrician')) {
        return "نعم، الكهرباء مهنة مهمة جداً. لدينا كهربائيون (Electricians) مؤهلون في مدن الدار البيضاء، الرباط وطنجة وغيرها. يرجى تصفح تبويب الحرفيين.";
      }
      if (q.includes('كيف') || q.includes('طلب')) {
        return "لإضافة طلب عمل: انتقل لعلامة التبويب 'طلب جديد' في القائمة، املأ معلومات مدينتك وحيك ونوع الخدمة وصورة العطل ثم انقر على زر النشر.";
      }
      if (q.includes('تطبيق') || q.includes('تحميل')) {
        return "يمكنك تحميل تطبيق الأندرويد الخاص بنا بالنقر على زر 'تحميل التطبيق' في شريط التنقل العلوي لتجربة هاتف أسرع وأسهل.";
      }
      if (q.includes('حذف') || q.includes('حساب')) {
        return "لحذف حسابك، انقر على 'حسابي' في القائمة لفتح لوحة معلومات حسابك، ثم اضغط على زر 'حذف الحساب نهائياً' لتتم إزالة بياناتك فوراً.";
      }
      return "شكراً لسؤالك. أنا هنا لمساعدتك في الاستخدام والتوجيه. إذا كنت تبحث عن خدمة معينة، يرجى كتابة اسم التخصص (مثل سباك، صباغ، كهربائي) أو كتابة سؤالك بوضوح.";
    }

    function rateBotMessage(elementId, isUp) {
      const el = document.getElementById(elementId);
      const buttons = el.querySelectorAll('.ai-message-actions button');
      buttons.forEach(btn => btn.disabled = true);

      if (isUp) {
        buttons[0].classList.add('rated-up');
      } else {
        buttons[1].classList.add('rated-down');
      }
    }
