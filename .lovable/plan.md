# Calendario mensile in Progressi

## Obiettivo
Aggiungere una quarta tab **CALENDARIO** dopo **FORZA**, mantenendo lo stile dark e compatto della pagina Progressi.

## Intervento
- Estendere la navigazione a quattro tab, rendendola leggibile anche sugli schermi piccoli.
- Aggiungere un calendario mensile con intestazione del mese e frecce precedente/successivo.
- Recuperare per il mese visualizzato gli allenamenti, i relativi esercizi completati e i check-in dell’utente.
- Mostrare sotto ogni giorno:
  - punto verde quando esiste almeno un allenamento;
  - punto grigio quando esiste un check-in ma nessun allenamento;
  - nessun punto quando non ci sono dati.
- Rendere selezionabili solo i giorni con allenamento e mostrare sotto il calendario il nome della sessione e il numero di esercizi completati. Se nello stesso giorno ci sono più sessioni, mostrarle tutte in righe separate.
- Gestire correttamente giorni iniziali/finali del mese e date locali senza slittamenti di fuso orario.

## Dettagli tecnici
- Riutilizzare le query Supabase autenticate e le policy RLS esistenti su `workout_sessions`, `workout_sets` e `checkins`.
- Integrare la vista in `DashboardMetrics` con un nuovo valore `calendar`, senza modifiche al database.
- Usare i token colore esistenti (`accent`, `muted`, `border`) e controlli accessibili con area di tocco adeguata.
- Aggiornare i metadati della pagina Progressi per includere il calendario.

## Verifica
- Controllare compilazione e assenza di errori runtime.
- Verificare visivamente tab, navigazione mesi, indicatori e dettaglio del giorno su viewport mobile.
