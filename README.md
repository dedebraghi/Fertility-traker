# 🌸 Fertility Tracker | Metodo Sintotermico CAMEN / Roetzer

Un'applicazione moderna, accattivante, responsive (PWA) e sicura per il monitoraggio della fertilità e l'applicazione del **Metodo Sintotermico (CAMEN / Roetzer)** con sincronizzazione in tempo reale e persistenza su **Supabase (100% Free Tier)**.

---

## ✨ Caratteristiche Principali

1. **🎨 Design "Soft Warm & Nature"**:
   - Palette calda e riposante (terracotta, sabbia, verde salvia, blush).
   - Componenti a card con ombre morbide, tipografia moderna (*Plus Jakarta Sans*) e feedback visuali.
2. **📱 Mobile-First con Bottom Bar**:
   - **🌸 Oggi**: Inserimento istantaneo al risveglio della temperatura (BBT con steppers `+/- 0.05°C` e orario), chip visuali descrittivi per flusso mestruale (M/m), sensazione vulvare (A/U/B/L), muco cervicale (+/-/*// e O/T/A/F/D/E), cervice uterina (D/S, C/S/A, B/M/A), rapporti (X/I/O/P) e note del giorno.
   - **📈 Grafico & Griglia**: Curva termica interattiva touch/zoom sincronizzata con la tabella sintotermica completa sottostante.
   - **📑 Storico Cicli**: Gestione multi-ciclo, statistiche di durata e passaggio rapido al ciclo attivo.
   - **⚙️ Impostazioni**: Connessione Supabase guidata, gestione account e strumento di importazione dati storici JSON.
3. **📄 Esportazione PDF Ufficiale CAMEN (A4 Landscape)**:
   - Generazione istantanea vettoriale ad altissima definizione della scheda a 40 colonne pronta per la stampa o l'invio all'insegnante/medico.
4. **🔒 Sicurezza con Supabase (Row Level Security)**:
   - Autenticazione Email e Password.
   - Ciascun utente ha accesso **esclusivo e privato** solo ai propri dati (`auth.uid() = user_id`).
   - 100% compatibile con il piano gratuito (zero costi).

---

## 🚀 Come Inizializzare Supabase (2 Passaggi Rapidi)

### Passaggio 1: Crea le tabelle nel tuo account Supabase
1. Accedi alla tua dashboard su [supabase.com](https://supabase.com).
2. Apri il tuo progetto e clicca su **SQL Editor** nel menu a sinistra.
3. Clicca su **New Query**, incolla tutto il contenuto del file [`supabase-schema.sql`](file:///g:/Il%20mio%20Drive/App/Fertility-traker/supabase-schema.sql) e clicca su **Run**.

### Passaggio 2: Collega l'App
1. Vai su **Project Settings** → **API** su Supabase.
2. Copia il tuo **Project URL** e la tua **Anon Public Key**.
3. Nell'app, apri la scheda **Impostazioni**, incolla i due valori e clicca **Salva Chiavi**.
4. Clicca su **Accedi / Registrati** per creare il tuo account e iniziare!

---

## 📦 Come Avviare l'App in Locale

Puoi avviare l'ambiente di sviluppo in qualsiasi momento:

```bash
# Avvia il server di sviluppo locale
npm run dev
```

Oppure visualizzare la build di produzione già compilata nella cartella `/dist`:
```bash
npm run preview
```

---

## 📂 Come Importare i Tuoi Vecchi Dati (JSON)

1. Effettua l'accesso con il tuo account nell'app.
2. Vai nella scheda **Impostazioni**.
3. Nella sezione **"Importa Cicli Precedenti (JSON)"**, clicca su **Seleziona File JSON da importare** e scegli i tuoi file `.json`.
4. I cicli e tutti i loro giorni registrati verranno automaticamente inseriti e salvati nel tuo database Supabase!
