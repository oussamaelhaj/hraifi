    // ─── Data Exporters: PDF & Excel (ADMIN-ONLY ACCESS) ─────────────────────────
    function exportArtisansPDF() {
      if (currentUserRole !== 'admin') return alert('غير مسموح. هذه الميزة خاصة بالإدارة فقط.');
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      doc.setFontSize(20);
      doc.text("Dossier des Artisans Morocains (Hraifi)", 14, 20);
      doc.setFontSize(10);
      doc.text(`Date de generation: ${new Date().toLocaleDateString()} | Confidential - Admin Only`, 14, 26);

      const bodyData = allArtisansList.map((artisan, index) => [
        index + 1,
        artisan.name || '',
        JOB_LABELS[artisan.job] || artisan.job || '',
        artisan.city || '',
        artisan.phone || '',
        (artisan.rating || 0).toFixed(1)
      ]);

      doc.autoTable({
        startY: 32,
        head: [['#', 'Nom', 'Job', 'Ville', 'Phone', 'Rating']],
        body: bodyData,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 95] },
        styles: { fontSize: 9 }
      });

      doc.save("liste-artisans-hraifi.pdf");
    }

    function exportArtisansExcel() {
      if (currentUserRole !== 'admin') return alert('غير مسموح. هذه الميزة خاصة بالإدارة فقط.');
      const formatted = allArtisansList.map(a => ({
        "الاسم الكامل": a.name,
        "المهنة": JOB_LABELS[a.job] || a.job,
        "المدينة": a.city,
        "المنطقة / الحي": a.district,
        "رقم الهاتف": a.phone,
        "التقييم العام": a.rating || 0,
        "عدد التقييمات": a.ratingCount || 0,
        "حالة التفعيل": a.verified ? "مؤكد" : "قيد المراجعة"
      }));

      const worksheet = XLSX.utils.json_to_sheet(formatted);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "الحرفيون");

      XLSX.writeFile(workbook, "liste-artisans-hraifi.xlsx");
    }
