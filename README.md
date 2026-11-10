# ⚽ Almanacco Calcio — Registro Partite, Marcatori e Statistiche

Applicazione desktop standalone per Windows pensata per registrare in modo semplice, veloce e sicuro le partite di calcio, i marcatori (con minuto, rigori, punizioni, autogol, assist e note), i cartellini e consultare classifiche aggiornate automaticamente.

---

## 🚀 Avvio Rapido (Zero Dipendenze)

L'applicazione compilata per Windows si trova nella cartella `dist-release`:

- **Eseguibile Portatile (Unico file `.exe`, non richiede installazione):**
  `dist-release\AlmanaccoCalcio-Portable.exe`
- **Versione Cartella Eseguibile Diretta:**
  `dist-release\win-unpacked\Almanacco Calcio.exe`

Puoi copiare `AlmanaccoCalcio-Portable.exe` sul Desktop o su una chiavetta USB: funziona su qualsiasi PC Windows 10/11 senza bisogno di installare nulla.

---

## 🌐 Stemmi Squadre e Loghi Campionati da Internet

1. **Download Automatico in 1 Clic**:
   - Vai nella scheda **Squadre & Stemmi** e premi **“Scarica Automaticamente Tutti gli Stemmi Mancanti”**, oppure clicca sul pulsante **🌐 Stemma / Cerca Logo** accanto a qualsiasi squadra o campionato (anche direttamente dal tabellone di inserimento partita!).
2. **Ricerca Online Integrata (`TheSportsDB` + `Wikipedia Italia & Internazionale`)**:
   - Cerca il nome di qualsiasi club o torneo, clicca sullo stemma desiderato e l'applicazione lo scarica e lo **salva permanentemente all'interno del database locale**.
   - Una volta scaricato, lo stemma resta visibile **anche senza connessione Internet**.
3. **Caricamento da PC o Link Web**:
   - È possibile anche caricare un file immagine dal computer (`.png`, `.svg`, `.jpg`, `.webp`) o incollare un link diretto da internet.

---

## 💾 Salvataggio Automatico & Sicurezza Dati

Ogni partita aggiunta o modificata viene salvata **istantaneamente** sul disco rigido con scrittura atomica anti-corruzione in due posizioni:
1. **Database Principale**: `%APPDATA%\scoreapp-calcio\data\database.json`
2. **Copia Specchio Automatica in Documenti**: `Documenti\Almanacco Calcio Backups\ultimo_salvataggio.json`
3. **Backup Giornalieri Storici (ultimi 30 giorni)**: `%APPDATA%\scoreapp-calcio\backups\`

---

## 📊 Ponte Excel (`.xlsx` / `.csv`) e Backup

Dalla barra superiore (sempre visibile):
- **Esporta Excel (`.xlsx`)**: genera un file Excel completo diviso in 3 fogli (*Partite*, *Gol e Cartellini*, *Classifica Marcatori*).
- **Esporta CSV (`.csv`)**: genera una tabella compatibile con Excel con codifica UTF-8 per gli accenti italiani.
- **Importa**: permette di ripristinare un file di backup `.json` oppure di importare partite storiche da un foglio Excel (`.xlsx` / `.csv`).
