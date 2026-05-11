import requests

URL = "http://localhost:8000/produtos"

produtos = [
    {
        "nome": "Placa de Vídeo RTX 4090 Galax",
        "descricao": "24GB GDDR6X, Ray Tracing, DLSS 3",
        "preco": 13499.90,
        "imagem_url": "https://placehold.co/600x400?text=RTX+4090",
        "estoque": 5
    },
    {
        "nome": "Processador Intel Core i9-14900K",
        "descricao": "24 Cores, 32 Threads, 6.0GHz Max Turbo",
        "preco": 3899.00,
        "imagem_url": "https://placehold.co/600x400?text=i9+14900K",
        "estoque": 10
    },
    {
        "nome": "Gabinete Gamer Lian Li Dynamic",
        "descricao": "Lateral em Vidro Temperado, Branco",
        "preco": 1200.00,
        "imagem_url": "https://placehold.co/600x400?text=Gabinete+Lian+Li",
        "estoque": 15
    }
]

for p in produtos:
    response = requests.post(URL, json=p)
    if response.status_code == 200:
        print(f"✅ Produto '{p['nome']}' cadastrado!")
    else:
        print(f"❌ Erro ao cadastrar {p['nome']}: {response.text}")
