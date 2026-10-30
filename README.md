# InnerG Team

Public status page for the InnerG SI team. Live at https://innergclaw.github.io/innerg-team/

- `data.json` is rebuilt every 20 minutes by `.github/workflows/refresh.yml` from public innergclaw repos only.
- `bots.json` lists each teammate. Keep private repo names out of it.
- Job sending goes through the Supabase edge function `dashboard-dispatch` (project zkyhhoxcrjkhywblzehr). The webhook URL and key live only as function secrets. Only the owner account can send.
