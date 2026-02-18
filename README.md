
# Dashboard FILKEMP

Dashboard para visualização de dados de produção a partir do ficheiro `VR.xlsx`.

## Pré-requisitos

- Node.js instalado (v16 ou superior).

## Instalação

1. Navegue para a pasta do projeto:
   ```bash
   cd dashboard
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

## Processar Dados

Para converter o ficheiro excel `../VR.xlsx` em dados JSON para o dashboard:

```bash
npm run process-data
```

Isto irá gerar ficheiros JSON na pasta `public/data`.

## Executar Localmente

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

Aceite o link apresentado (ex: `http://localhost:5173`) para ver o dashboard no browser.

## Build para Produção (Netlify)

O projeto está configurado para deploy no Netlify.
Comando de build: `npm install && npm run process-data && npm run build`
Diretório de publicação: `dist`
