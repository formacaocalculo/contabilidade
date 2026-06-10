# ContaSNC — Sistema de Contabilidade SNC Portugal

Aplicação web multi-empresa de contabilidade, conforme o **Sistema de Normalização Contabilística (SNC)** português.

## Como usar

Abra `empresas.html` no browser, crie uma empresa e entre no sistema.  
Todos os dados são guardados automaticamente no **localStorage** do browser — sem servidor, sem base de dados.

## Deploy no GitHub Pages

1. Crie um repositório no GitHub (pode ser público ou privado)
2. Faça upload de todos os ficheiros para a raiz do repositório
3. Vá a **Settings → Pages → Source → Deploy from branch → main / root**
4. O site fica disponível em `https://SEU-UTILIZADOR.github.io/NOME-DO-REPO/`

## Deploy no Vercel

1. Crie um repositório no GitHub com os ficheiros
2. Aceda a [vercel.com](https://vercel.com) e clique em **Add New Project**
3. Importe o repositório GitHub
4. Em **Framework Preset** seleccione **Other**
5. Deixe as restantes opções por defeito e clique **Deploy**
6. O site fica disponível em `https://NOME.vercel.app/`

> **Nota:** O Vercel serve automaticamente `index.html` como página inicial, que redirige para `empresas.html` se não houver empresa activa.

## Estrutura de Ficheiros

```
├── index.html          # Painel de controlo
├── empresas.html       # Gestão multi-empresa (ponto de entrada)
├── plano-contas.html   # Plano de Contas SNC
├── diarios.html        # Gestão de Diários
├── lancamentos.html    # Lançamentos contabilísticos
├── iva.html            # Processamento IVA + SAF-T(PT)
├── db.js               # Motor de dados (localStorage)
├── script.js           # UI partilhada
├── _sidebar.js         # Sidebar dinâmica
└── style.css           # Design system
```

## Funcionalidades

- **Multi-empresa** — dados separados por empresa, troca instantânea
- **Persistência** — localStorage (os dados sobrevivem ao fecho do browser)
- **Plano de Contas SNC** — 60+ contas pré-configuradas, subcontas personalizáveis
- **Diários** — Compras, Vendas, Bancos, Caixa, OD, Salários
- **Lançamentos** — cálculo automático de IVA (23%/13%/6%) e retenções na fonte
- **Apuramento de IVA** — por período, com detalhe por taxa
- **SAF-T(PT)** — exportação de XML real conforme esquema v1.04_01 da AT
- **Backup/Restore** — exportar empresa como JSON, importar noutro browser
- **Sem servidor** — funciona 100% no browser, deploy estático

## Limitações desta versão

- O localStorage está limitado a ~5 MB por domínio (suficiente para PMEs)
- A submissão à AT é simulada (integração real requer webservice da AT com certificado)
- Não inclui módulo de relatórios (Balanço, DRE) — previsto em versão futura
