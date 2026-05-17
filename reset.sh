#!/bin/bash
# ╔══════════════════════════════════════════╗
# ║     JC Games Store — Reset Completo      ║
# ╚══════════════════════════════════════════╝

echo "⚠️  Isso vai APAGAR tudo e reinstalar do zero!"
read -p "Tem certeza? (sim/não): " CONFIRM
[ "$CONFIRM" != "sim" ] && echo "Cancelado." && exit 0

cd ~/site
docker compose down -v --rmi all
cd ~
mv ~/site ~/site.bak_$(date +%Y%m%d_%H%M)
docker system prune -af --volumes

git clone https://github.com/RetroLuxxo/site.git ~/site
cd ~/site
bash setup.sh
