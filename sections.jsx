// Yodesarrollo-Board · Sections
// Cada sección recibe { tile, navigate, onHome } y lee su data de useData().

const fmt   = (n) => "$" + Number(n || 0).toLocaleString("en-US");
const fmtMx = (n) => "$" + Number(n || 0).toLocaleString("en-US") + " MXN";

// Liga de ARCHIVO (no de imagen). El backend convierte todo *_url al formato
// lh3.googleusercontent.com (miniatura); para botones de material eso abre solo
// la "portada". Aquí se reconstruye la liga real de Drive a partir del ID, y se
// antepone https:// cuando la celda trae la liga sin protocolo (ej. wa.me/...).
const linkArchivo = (u) => {
  const s = String(u || "").trim();
  if (!s) return s;
  if (/^(assets\/|\.\/|\/)/.test(s)) return s;   // material local del repo
  const m = s.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return "https://drive.google.com/file/d/" + m[1] + "/view";
  if (!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(s)) return "https://" + s;
  return s;
};

// Material local (assets/material/): sustituye a las ligas de Drive mientras la
// cuenta de Google esté suspendida (ago-2026). Para volver a usar la liga del
// Sheet en un botón, borra su entrada aquí.
const MATERIAL_LOCAL = {
  "casa-alysa": {
    presentacion_url: "assets/material/casa-alysa-presentacion.pdf",
    pdf_dossier_url:  "assets/material/casa-alysa-onepager.pdf",
    video_url:        "assets/material/casa-alysa-avance.mp4",
  },
  "real-miramar": {
    presentacion_url: "assets/material/real-miramar-presentacion.pdf",
    pdf_dossier_url:  "assets/material/real-miramar-onepager.pdf",
  },
  "dunas-kino": {
    presentacion_url: "assets/material/dunas-kino-presentacion.pdf",
    pdf_dossier_url:  "assets/material/dunas-kino-presentacion.pdf",
  },
};
// Liga de material: primero la copia local, luego lo que diga el Sheet.
const matUrl = (p, key) => {
  const local = MATERIAL_LOCAL[p.id];
  return linkArchivo((local && local[key]) || p[key]);
};
// --------------------------- Section shell ---------------------------
const Shell = ({ tile, onHome, navigate, related, kicker, journey, children }) => {
  const { data } = window.useData();
  const brandUrl = ((data && data.config) || {}).brand_url || "https://yodesarrollo.mx";
  return (
    <div className="section" style={{ ["--accent"]: tile.accent }}>
      <header className="sec-head">
        <button className="chip-btn" onClick={onHome}>
          <IconHome size={18} /> <span>Board</span>
        </button>
        <div className="breadcrumb">
          <span className="kicker">{kicker || tile.kicker}</span>
          <span className="dot">·</span>
          <span className="crumb">{tile.label}</span>
        </div>
        <div className="head-right">
          <a
            className="head-brand-link mono small muted"
            href={brandUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Ir a yodesarrollo.mx"
          >
            YODESARROLLO · SAPI
          </a>
        </div>
      </header>
      <main className="sec-body">{children}</main>
      {journey && (
        <nav className="journey-nav" aria-label="Navegación entre hojas">
          <button
            className="journey-btn journey-btn--previous"
            type="button"
            onClick={() => journey.previous && navigate(journey.previous.id)}
            disabled={!journey.previous}
          >
            <IconArrow size={15} sw={2} />
            <span><small>Hoja anterior</small><strong>{journey.previous ? journey.previous.label : "Inicio"}</strong></span>
          </button>
          <button className="journey-index" type="button" onClick={onHome} title="Ver todas las hojas">
            <span>{journey.index} / {journey.total}</span>
            <small>Ver índice</small>
          </button>
          <button
            className="journey-btn journey-btn--next"
            type="button"
            onClick={() => journey.next && navigate(journey.next.id)}
            disabled={!journey.next}
          >
            <span><small>Hoja siguiente</small><strong>{journey.next ? journey.next.label : "Fin"}</strong></span>
            <IconArrow size={15} sw={2} />
          </button>
        </nav>
      )}
      {related && related.length > 0 && (
        <footer className="related">
          <span className="related-label">Saltar a</span>
          <div className="related-row">
            {related.map((r) => {
              const lookup = window.buildTileLookup(data.tiles);
              const t = lookup[r];
              if (!t) return null;
              return (
                <button key={r} className="related-pill" onClick={() => navigate(r)}>
                  {t.label}
                  <IconArrow size={14} sw={2} />
                </button>
              );
            })}
          </div>
        </footer>
      )}
    </div>
  );
};

// =============================================================================
// 1. DIAGNÓSTICO
// =============================================================================
const SecDiagnostico = (props) => {
  const { data, save } = window.useData();
  const formDef = (data.diagnostico && data.diagnostico.form) || [];
  const [answers, setAnswers] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);

  const set = (k) => (e) => setAnswers((d) => ({ ...d, [k]: e.target.value }));
  const setChip = (k, v) => setAnswers((d) => ({ ...d, [k]: v }));

  // Agrupa preguntas por card_num
  const cards = React.useMemo(() => {
    const map = new Map();
    formDef
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((f) => {
        const n = f.card_num;
        if (!map.has(n)) {
          map.set(n, { num: n, legend: f.card_legend, time: f.card_time, fields: [] });
        }
        map.get(n).fields.push(f);
      });
    return Array.from(map.values());
  }, [formDef]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const cliente = answers.nombre || "(sin nombre)";
      await save("save_diagnostico", { ...answers, cliente });
      setSavedAt(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      alert("No se pudo guardar: " + e.message + "\nLa respuesta queda en pantalla.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell {...props} related={["comparativo", "casa-alysa", "real-miramar"]}>
      <div className="diag">
        <div className="diag-intro">
          <h1 className="display">Antes de hablar de dónde invertir,<br/>hablemos de qué quieres construir.</h1>
          <p className="lead">Esta hoja la llenamos juntos. No hay respuestas correctas o incorrectas — solo respuestas honestas. Define la propuesta que tendrá sentido para ti.</p>
        </div>

        <div className="diag-grid">
          {cards.map((card) => (
            <fieldset key={card.num} className="card">
              <legend>{card.num} · {card.legend} <span className="time">{card.time}</span></legend>
              {card.fields.map((f) => {
                if (f.field_type === "text") {
                  return (
                    <label key={f.field_key}>{f.field_label}
                      <input
                        value={answers[f.field_key] || ""}
                        onChange={set(f.field_key)}
                        placeholder="—"
                      />
                    </label>
                  );
                }
                if (f.field_type === "textarea") {
                  return (
                    <label key={f.field_key}>{f.field_label}
                      <textarea
                        value={answers[f.field_key] || ""}
                        onChange={set(f.field_key)}
                        placeholder="—"
                        rows={f.rows || 2}
                      />
                    </label>
                  );
                }
                if (f.field_type === "chips") {
                  const opts = String(f.field_options || "").split("|").filter(Boolean);
                  return (
                    <label key={f.field_key}>{f.field_label}
                      <div className="chips">
                        {opts.map((c) => (
                          <button key={c} type="button"
                            className={"chip" + (answers[f.field_key] === c ? " on" : "")}
                            onClick={() => setChip(f.field_key, c)}>{c}</button>
                        ))}
                      </div>
                    </label>
                  );
                }
                return null;
              })}
            </fieldset>
          ))}
        </div>

        <div className="diag-save">
          <button className="foot-cta" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar respuestas"}
            <IconArrow size={14} sw={2} />
          </button>
          {savedAt && <span className="diag-saved-note mono">✓ Guardado a las {savedAt}</span>}
        </div>
      </div>
    </Shell>
  );
};

// =============================================================================
// 2. COMPARATIVO
// =============================================================================
const SecComparativo = (props) => {
  const { data } = window.useData();
  const rows = (data.comparativo || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

  const proyectos = ((data.proyectos) || []).filter(
    (p) => p.activo !== false && (p.modelo === "coinversion" || p.modelo === "plusvalia")
  );
  const [sideBySide, setSideBySide] = React.useState(false);

  const cardData = (p) => {
    const esCoinv = p.modelo === "coinversion";
    const ticket = esCoinv
      ? (p.ci_ticket_min ? fmt(p.ci_ticket_min) : "—")
      : (p.pv_calc_min ? fmt(p.pv_calc_min) : "—");
    const plazo = (esCoinv ? (Number(p.ci_plazo) || 8) : (Number(p.pv_plazo) || 24)) + " meses";
    const tasaEstrella = Number(p.ci_tasa_base || 0) + Number(p.ci_tasa_incr || 0) * ((Number(p.ci_tramo_estrella) || 1) - 1);
    const retorno = esCoinv
      ? "Hasta " + tasaEstrella + "% anual"
      : "+" + (((p.plusvalia && p.plusvalia.plusvalia_24m_pct) || 0)) + "% a " + (Number(p.pv_plazo) || 24) + "m";
    const perfil = esCoinv ? "Tasa fija contractual" : "Plusvalía de mercado";
    return { esCoinv, ticket, plazo, retorno, perfil };
  };

  return (
    <Shell {...props} related={["diagnostico", "calculadora", "casa-alysa", "real-miramar"]}>
      <div className="comp">
        <div className="sec-title-row">
          <span className="kicker">Acto II · Análisis Comparado</span>
          <h1 className="display">Lo que tu dinero<br/>te rinde realmente.</h1>
          <p className="lead">Después de inflación e impuestos. Todo en una sola tabla, sin maquillaje.</p>
        </div>

        {proyectos.length > 0 && (
          <div className="comp-switch">
            <button className={!sideBySide ? "on" : ""} onClick={() => setSideBySide(false)}>Tabla comparativa</button>
            <button className={sideBySide ? "on" : ""} onClick={() => setSideBySide(true)}>Comparar lado a lado</button>
          </div>
        )}

        {!sideBySide ? (
          <table className="comp-table">
            <thead>
              <tr>
                <th>Instrumento</th>
                <th className="num">Bruto</th>
                <th className="num">− Inflación</th>
                <th className="num">− ISR</th>
                <th className="num">Real neto</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.instrumento} className={r.star ? "star" : ""}
                    onClick={r.link ? () => props.navigate(r.link) : undefined}>
                  <td>{r.star && <span className="star-mark">★</span>}{r.instrumento}</td>
                  <td className="num mono">{r.bruto}</td>
                  <td className="num mono muted">{r.inflacion}</td>
                  <td className="num mono muted">{r.isr}</td>
                  <td className="num mono accent">{r.neto}</td>
                  <td className="muted small">{r.nota}{r.link && <span className="row-arrow"> →</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="comp-cards">
            {proyectos.map((p) => {
              const d = cardData(p);
              return (
                <div className="comp-card" key={p.id} style={{ ["--c"]: p.color, ["--a"]: p.accent }}>
                  <span className="cc-tipo mono">{d.esCoinv ? "Coinversión" : "Plusvalía"}</span>
                  <h3 className="cc-nombre">{p.nombre}</h3>
                  <dl className="cc-stats">
                    <div><dt>Ticket mínimo</dt><dd className="mono">{d.ticket}</dd></div>
                    <div><dt>Plazo</dt><dd className="mono">{d.plazo}</dd></div>
                    <div><dt>Retorno esperado</dt><dd className="mono accent">{d.retorno}</dd></div>
                    <div><dt>Perfil</dt><dd>{d.perfil}</dd></div>
                  </dl>
                  <button className="cc-cta" onClick={() => props.navigate(p.id)}>Ver {p.nombre} →</button>
                </div>
              );
            })}
          </div>
        )}

        <div className="pull-quote">
          <span className="quote-mark">"</span>
          Si tu dinero hoy te rinde 2–4% real, ¿cuánto puedes esperar para construir patrimonio?
        </div>
      </div>
    </Shell>
  );
};

// =============================================================================
// 3. CASA ALYSA
// =============================================================================
// --- MaterialDelProyecto: los botones de presentacion / propuesta / video ------
//  Vive aparte para que lo puedan usar TANTO la seccion generica como las
//  secciones propias de Casa Alysa y Real Miramar, que son anteriores y se
//  habian quedado sin el bloque. Lee la fila del proyecto por id del tab
//  Proyectos, asi que respeta lo que este en el Sheet y el respaldo local.
const MaterialDelProyecto = ({ id, p: pDirecto }) => {
  const { data } = window.useData();
  const p = pDirecto || ((data && data.proyectos) || []).filter((x) => x.id === id)[0] || {};
  if (!(p.presentacion_url || p.pdf_dossier_url || p.video_url || p.cta_url)) return null;
  return (
    <section className="block">
      <h2 className="block-title">Material del proyecto</h2>
      <div className="proj-action-row">
        {p.presentacion_url && (
          <a className="path-cta" href={matUrl(p, "presentacion_url")} target="_blank" rel="noreferrer">
            Ver presentación completa <IconArrow size={14} sw={2} />
          </a>
        )}
        {p.pdf_dossier_url && (
          <a className="path-cta" href={matUrl(p, "pdf_dossier_url")} target="_blank" rel="noreferrer">
            Ver propuesta (PDF) <IconArrow size={14} sw={2} />
          </a>
        )}
        {p.video_url && (
          <a className="path-cta" href={matUrl(p, "video_url")} target="_blank" rel="noreferrer">
            Ver avance de obra <IconArrow size={14} sw={2} />
          </a>
        )}
        {p.cta_url && (
          <a className="path-cta" href={linkArchivo(p.cta_url)} target="_blank" rel="noreferrer">
            {p.cta_text || "Más información"} <IconArrow size={14} sw={2} />
          </a>
        )}
      </div>
    </section>
  );
};

const SecCasaAlysa = (props) => {
  const { data } = window.useData();
  const hero    = (data.alysa && data.alysa.hero) || {};
  const tiers   = (data.alysa && data.alysa.tiers) || [];
  const porQue  = (data.alysa && data.alysa.por_que) || [];
  const como    = (data.alysa && data.alysa.como) || [];

  return (
    <Shell {...props} related={["calculadora", "garantias", "estrategia", "cronograma"]}>
      <div className="proj">
        <div className="proj-hero alysa-hero">
          <div className="hero-text">
            <span className="kicker">{hero.kicker}</span>
            <h1 className="display">{hero.display}</h1>
            <p className="lead">{hero.lead}</p>
            <div className="stat-row">
              <div className="stat"><span className="big mono">{hero.stat_1_value}</span><span className="mini">{hero.stat_1_label}</span></div>
              <div className="stat"><span className="big mono">{hero.stat_2_value}</span><span className="mini">{hero.stat_2_label}</span></div>
              <div className="stat"><span className="big mono">{hero.stat_3_value}</span><span className="mini">{hero.stat_3_label}</span></div>
              <div className="stat"><span className="big mono">{hero.stat_4_value}</span><span className="mini">{hero.stat_4_label}</span></div>
            </div>
          </div>
          <div className="hero-img">
            {hero.img_url ? (
              <img src={hero.img_url} alt={hero.img_caption || "Render Casa Alysa"} className="hero-img-real" />
            ) : (
              <div className="img-placeholder">
                <span className="ph-label">{hero.img_caption || "Render Casa Alysa"}</span>
                <span className="ph-sub">— {hero.ubicacion || "Altozano · Hermosillo"} —</span>
              </div>
            )}
          </div>
        </div>

        <section className="block">
          <h2 className="block-title">Estructura escalonada · más capital, mejor tasa</h2>
          <table className="comp-table">
            <thead>
              <tr>
                <th>Capital</th><th className="num">Tasa anual</th><th className="num">Retorno 6m</th><th className="num">Retorno 8m</th><th className="num">Total 8m</th>
              </tr>
            </thead>
            <tbody>
              {tiers.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map((t) => (
                <tr key={t.capital} className={t.star ? "star" : ""}>
                  <td className="mono">{t.star && <span className="star-mark">★</span>}{fmt(t.capital)}</td>
                  <td className="num mono">{Number(t.rate).toFixed(2)}%</td>
                  <td className="num mono muted">{fmt(t.retorno6)}</td>
                  <td className="num mono muted">{fmt(t.retorno8)}</td>
                  <td className="num mono accent">{fmt(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted">Cálculo: Capital × Tasa anualizada × Meses ÷ 12. Ejemplo: $200K × 20% × 8/12 = $26,667.</p>
        </section>

        <section className="block two-col">
          <div>
            <h2 className="block-title">Por qué se coloca rápido</h2>
            <ul className="bullets">
              {porQue.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map((b) => (
                <li key={b.order}><strong>{b.strong}</strong> — {b.text}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="block-title">Cómo entras</h2>
            <ul className="bullets">
              {como.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map((b) => (
                <li key={b.order} dangerouslySetInnerHTML={{ __html: b.html }} />
              ))}
            </ul>
          </div>
        </section>


        {/* Material del proyecto — mismo bloque que usa SecProyecto.
            Casa Alysa y Real Miramar tienen componente propio (heredado) y por eso
            se habian quedado SIN los botones de material: el bloque solo vivia en la
            seccion generica, que es la que usan los proyectos nuevos como Dunas.
            El proyecto se saca del tab Proyectos por id. */}
        <MaterialDelProyecto id="casa-alysa" />
      </div>
    </Shell>
  );
};

// =============================================================================
// 4. REAL MIRAMAR
// =============================================================================
const SecRealMiramar = (props) => {
  const { data } = window.useData();
  const hero       = (data.miramar && data.miramar.hero) || {};
  const urbanismo  = (data.miramar && data.miramar.urbanismo) || [];
  const loteEj     = (data.miramar && data.miramar.lote_ejemplo) || [];

  return (
    <Shell {...props} related={["calculadora", "garantias", "estrategia", "cronograma"]}>
      <div className="proj">
        <div className="rm-hero compact">
          <div className="rm-hero-text">
            <span className="kicker">{hero.kicker}</span>
            <h1 className="display rm-display">{hero.display}</h1>
          </div>
          <div className="rm-hero-stats">
            <div className="rm-stat"><span className="rm-stat-val mono">{hero.stat_1_value}</span><span className="rm-stat-lbl mono">{hero.stat_1_label}</span></div>
            <div className="rm-stat"><span className="rm-stat-val mono accent">{hero.stat_2_value}</span><span className="rm-stat-lbl mono">{hero.stat_2_label}</span></div>
            <div className="rm-stat"><span className="rm-stat-val mono">{hero.stat_3_value}</span><span className="rm-stat-lbl mono">{hero.stat_3_label}</span></div>
            <div className="rm-stat"><span className="rm-stat-val mono">{hero.stat_4_value}</span><span className="rm-stat-lbl mono">{hero.stat_4_label}</span></div>
          </div>
        </div>

        <LoteSelector />

        <details className="rm-extras">
          <summary>Urbanismo integral · Caso fundador</summary>
          <div className="rm-extras-grid">
            <div>
              <h3 className="block-title">Urbanismo</h3>
              <ul className="bullets">
                {urbanismo.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map((u) => (
                  <li key={u.order}>{u.text}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="block-title">{(loteEj.find((r) => r.key === "titulo") || {}).label || "Lote 180 m² Fundador II"}</h3>
              <table className="kv">
                <tbody>
                  {loteEj.filter((r) => r.key !== "titulo").map((r) => (
                    <tr key={r.key} className={r.highlight ? "hi" : ""}>
                      <td>{r.label}</td>
                      <td className={"num mono" + (r.highlight ? " accent" : "")}>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>

        {/* Mismo caso que Casa Alysa: seccion propia heredada, sin el bloque. */}
        <MaterialDelProyecto id="real-miramar" />
      </div>
    </Shell>
  );
};

// =============================================================================
// 5. CALCULADORA
// =============================================================================
const SecCalculadora = (props) => {
  const { data } = window.useData();

  // Proyectos invertibles activos (coinversión o plusvalía) — el motor entrega
  // sus tiers/plusvalía ya derivados por proyecto.
  const invertibles = ((data.proyectos) || []).filter(
    (p) => p.activo !== false && (p.modelo === "coinversion" || p.modelo === "plusvalia")
  );

  // Fallback al esquema viejo si el motor no entrega proyectos (modo offline / data.json).
  const legacyBrackets = ((data.calculadora && data.calculadora.alysa_brackets) || [])
    .slice().sort((a, b) => a.min_capital - b.min_capital);
  const legacyMir = (data.calculadora && data.calculadora.miramar_config) || {};

  const firstCoinv = invertibles.find((p) => p.modelo === "coinversion");
  const firstPlus  = invertibles.find((p) => p.modelo === "plusvalia");

  // Tabs: uno por proyecto activo + Estrategia (si hay coinversión y plusvalía).
  const opciones = invertibles.map((p) => ({
    id: p.id,
    t: p.nombre + " · " + (p.modelo === "coinversion"
      ? (Number(p.ci_plazo) || 8) + "m"
      : (Number(p.pv_plazo) || 24) + "m"),
  }));
  if (firstCoinv && firstPlus) {
    opciones.push({ id: "estrategia", t: "Estrategia · " + firstCoinv.nombre + "→" + firstPlus.nombre });
  }
  if (!opciones.length) {
    // Fallback legacy
    opciones.push({ id: "alysa", t: "Casa Alysa · 8m" });
    opciones.push({ id: "miramar", t: "Real Miramar · 24m" });
    opciones.push({ id: "estrategia", t: "Estrategia · Alysa→Miramar" });
  }

  const [compareSet, setCompareSet] = React.useState([opciones[0].id]);
  const proj = compareSet[0] || opciones[0].id; // foco: alimenta el panel de detalle y el slider
  const [capital, setCapital] = React.useState(window.YDR_INITIAL_CAPITAL || 1000000);

  const sel = invertibles.find((p) => p.id === proj);

  // Config del slider según la selección.
  let minCap = 200000, maxCap = 3000000, step = 50000;
  if (sel && sel.modelo === "plusvalia") {
    minCap = Number(sel.pv_calc_min) || 200000;
    maxCap = Number(sel.pv_calc_max) || 3000000;
    step   = Number(sel.pv_calc_step) || 50000;
  } else if (sel && sel.modelo === "coinversion" && sel.tiers && sel.tiers.length) {
    minCap = sel.tiers[0].capital;
    maxCap = sel.tiers[sel.tiers.length - 1].capital;
    step   = Number(sel.ci_paso) || 50000;
  } else if (!invertibles.length) {
    minCap = legacyMir.min_capital || 200000;
    maxCap = legacyMir.max_capital || 3000000;
    step   = legacyMir.step || 50000;
  }

  // Tasa escalonada de una coinversión a partir de sus tramos (o de los brackets legacy).
  const coinvRate = (tiers, c) => {
    if (tiers && tiers.length) {
      let r = tiers[0].rate;
      for (const t of tiers) if (c >= t.capital) r = t.rate;
      return r;
    }
    let r = legacyBrackets.length ? legacyBrackets[0].rate : 20;
    for (const b of legacyBrackets) if (c >= b.min_capital) r = b.rate;
    return r;
  };

  let result;
  if (proj === "estrategia") {
    const r = coinvRate(firstCoinv && firstCoinv.tiers, capital);
    const plazoA = (firstCoinv && Number(firstCoinv.ci_plazo)) || 8;
    const r8 = capital * (r / 100) * (plazoA / 12);
    const after8 = capital + r8;
    const plus24 = ((firstPlus && firstPlus.plusvalia && firstPlus.plusvalia.plusvalia_24m_pct)
      || legacyMir.plusvalia_24m_pct || 53) / 100;
    const total = after8 + after8 * plus24;
    result = {
      rate: Math.round((total / capital - 1) * 100) + "% acumulado",
      months: ((firstPlus && Number(firstPlus.pv_plazo)) || 24) + " meses",
      gain: total - capital, total, pct: (total / capital - 1) * 100,
    };
  } else if (sel && sel.modelo === "coinversion") {
    const r = coinvRate(sel.tiers, capital);
    const plazo = Number(sel.ci_plazo) || 8;
    const g = capital * (r / 100) * (plazo / 12);
    result = { rate: r + "% anual", months: plazo + " meses", gain: g, total: capital + g, pct: (g / capital) * 100 };
  } else if (sel && sel.modelo === "plusvalia") {
    const pct = ((sel.plusvalia && sel.plusvalia.plusvalia_24m_pct) || 0) / 100;
    const anual = (sel.plusvalia && sel.plusvalia.anualizado_pct) || 0;
    const g = capital * pct;
    result = { rate: anual + "% anualizado", months: (Number(sel.pv_plazo) || 24) + " meses", gain: g, total: capital + g, pct: pct * 100 };
  } else {
    // Fallback legacy (modo offline sin proyectos)
    const plusvalia24m = (legacyMir.plusvalia_24m_pct || 53) / 100;
    const anualizado   = legacyMir.anualizado_pct || 26;
    if (proj === "miramar") {
      const g = capital * plusvalia24m;
      result = { rate: anualizado + "% anualizado", months: "24 meses", gain: g, total: capital + g, pct: plusvalia24m * 100 };
    } else if (proj === "estrategia") {
      const r = coinvRate(null, capital); const r8 = capital * (r / 100) * (8 / 12);
      const after8 = capital + r8; const total = after8 + after8 * plusvalia24m;
      result = { rate: Math.round((total / capital - 1) * 100) + "% acumulado", months: "24 meses", gain: total - capital, total, pct: (total / capital - 1) * 100 };
    } else {
      const r = coinvRate(null, capital); const r8 = capital * (r / 100) * (8 / 12);
      result = { rate: r + "% anual", months: "8 meses", gain: r8, total: capital + r8, pct: (r8 / capital) * 100 };
    }
  }

  const quickPicks = [200000, 500000, 1000000, 2000000].filter((v) => v >= minCap && v <= maxCap);

  // ── Comparación de vehículos en una sola línea de tiempo ──
  const PAL = ["var(--gold-hi)", "#7aa6d6", "#5dcaa5", "#c98aa6", "#b8a0d8"];
  const colorDe = (id) => { const i = opciones.findIndex((o) => o.id === id); return PAL[(i < 0 ? 0 : i) % PAL.length]; };
  const calcVehiculo = (id) => {
    const p = invertibles.find((x) => x.id === id);
    let total, plazoM, nombre, cambio = null;
    if (id === "estrategia") {
      const r = coinvRate(firstCoinv && firstCoinv.tiers, capital);
      const plazoA = (firstCoinv && Number(firstCoinv.ci_plazo)) || 8;
      const after8 = capital + capital * (r / 100) * (plazoA / 12);
      const plus24 = (((firstPlus && firstPlus.plusvalia && firstPlus.plusvalia.plusvalia_24m_pct) || legacyMir.plusvalia_24m_pct || 53)) / 100;
      total = after8 + after8 * plus24; plazoM = (firstPlus && Number(firstPlus.pv_plazo)) || 24;
      nombre = "Estrategia"; cambio = { mes: plazoA, val: after8 };
    } else if (p && p.modelo === "coinversion") {
      const r = coinvRate(p.tiers, capital); plazoM = Number(p.ci_plazo) || 8;
      total = capital + capital * (r / 100) * (plazoM / 12); nombre = p.nombre;
    } else if (p && p.modelo === "plusvalia") {
      const pct = ((p.plusvalia && p.plusvalia.plusvalia_24m_pct) || 0) / 100;
      plazoM = Number(p.pv_plazo) || 24; total = capital + capital * pct; nombre = p.nombre;
    } else {
      const pv = (legacyMir.plusvalia_24m_pct || 53) / 100;
      if (id === "miramar") { plazoM = 24; total = capital + capital * pv; nombre = "Real Miramar"; }
      else if (id === "estrategia") { const r = coinvRate(null, capital); const a8 = capital + capital * (r / 100) * (8 / 12); plazoM = 24; total = a8 + a8 * pv; nombre = "Estrategia"; cambio = { mes: 8, val: a8 }; }
      else { const r = coinvRate(null, capital); plazoM = 8; total = capital + capital * (r / 100) * (8 / 12); nombre = "Casa Alysa"; }
    }
    const N = 24, serie = [];
    for (let i = 0; i <= N; i++) {
      const mes = (plazoM * i) / N; let val;
      if (cambio && mes > cambio.mes) val = cambio.val + (total - cambio.val) * ((mes - cambio.mes) / Math.max(1, plazoM - cambio.mes));
      else if (cambio) val = capital + (cambio.val - capital) * (cambio.mes ? mes / cambio.mes : 0);
      else val = capital + (total - capital) * (plazoM ? mes / plazoM : 0);
      serie.push({ mes: mes, val: val });
    }
    return { id: id, nombre: nombre, total: total, plazoMeses: plazoM, gain: total - capital, serie: serie, color: colorDe(id) };
  };
  const activeIds = (compareSet.length ? compareSet : [proj]);
  const compareList = activeIds.map(calcVehiculo).filter(Boolean);
  const toggleCompare = (id) => setCompareSet((s) => {
    const base = s.length ? s : [proj];
    return base.includes(id) ? (base.length > 1 ? base.filter((x) => x !== id) : base) : base.concat([id]);
  });

  const CW = 760, CH = 250, mL = 76, mR = 18, mT = 34, mB = 30;
  const plotW = CW - mL - mR, plotH = CH - mT - mB;
  const plazoMax = Math.max.apply(null, compareList.map((v) => v.plazoMeses).concat([1]));
  const vMin = capital;
  const vMax = Math.max.apply(null, compareList.map((v) => v.total).concat([capital * 1.04]));
  const xAt = (mes) => mL + (plazoMax ? mes / plazoMax : 0) * plotW;
  const yAt = (v) => mT + (1 - (v - vMin) / Math.max(1, vMax - vMin)) * plotH;
  const pathDe = (serie) => serie.map((p, i) => (i === 0 ? "M" : "L") + xAt(p.mes).toFixed(1) + " " + yAt(p.val).toFixed(1)).join(" ");
  const yTicks = [vMin, (vMin + vMax) / 2, vMax];

  // ── Ficha PDF de la simulación (para que el inversionista se la lleve) ──
  const descargarFicha = () => {
    const projName = proj === "estrategia" ? "Estrategia combinada" : (sel ? sel.nombre : "Inversión");
    const row = (k, v) => '<tr><td style="padding:9px 0;border-bottom:1px solid #e5e0d6;color:#76726b;">' + k + '</td><td style="padding:9px 0;border-bottom:1px solid #e5e0d6;text-align:right;font-weight:600;color:#1a1814;">' + v + '</td></tr>';
    const wrap = document.createElement("div");
    wrap.style.cssText = "font-family:Manrope,Arial,sans-serif;color:#1a1814;padding:30px;width:600px;background:#fff;";
    wrap.innerHTML =
      '<div style="border-bottom:2px solid #9A7B2A;padding-bottom:12px;margin-bottom:20px;">' +
        '<div style="font-size:11px;letter-spacing:.22em;color:#9A7B2A;">YODESARROLLO &middot; SAPI</div>' +
        '<div style="font-size:28px;font-family:Georgia,serif;margin-top:4px;">Tu simulaci&oacute;n de inversi&oacute;n</div>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
        row("Producto", projName) +
        row("Capital invertido", fmt(capital)) +
        row("Plazo", result.months) +
        row("Tasa / rendimiento", result.rate) +
        row("Ganancia bruta estimada", fmt(Math.round(result.gain))) +
        row("Total proyectado al cierre", fmt(Math.round(result.total))) +
      '</table>' +
      '<p style="font-size:11px;color:#76726b;margin-top:20px;line-height:1.5;">Proyecci&oacute;n sobre tasa preferente / plusval&iacute;a bruta. Antes de inflaci&oacute;n e ISR. Sujeto a contrato escriturado. Generado el ' + new Date().toLocaleDateString("es-MX") + '.</p>';
    if (window.html2pdf) {
      window.html2pdf().set({ margin: 8, filename: "simulacion-yodesarrollo.pdf", image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2, backgroundColor: "#ffffff" }, jsPDF: { unit: "mm", format: "a4", orientation: "portrait" } }).from(wrap).save();
    } else {
      alert("La descarga de PDF no está disponible en este momento.");
    }
  };

  return (
    <Shell {...props} related={["casa-alysa", "real-miramar", "estrategia"]}>
      <div className="calc">
        <div className="sec-title-row">
          <span className="kicker">Simulador interactivo</span>
          <h1 className="display">Calculadora de inversión</h1>
          <p className="lead">Mueve el capital, escoge vehículo, ve el resultado al instante.</p>
        </div>

        <div className="calc-grid">
          <div className="calc-controls card">
            <div className="control">
              <label>Vehículo · marca los que quieras comparar</label>
              <div className="seg seg-multi">
                {opciones.map((o) => (
                  <button key={o.id} className={compareSet.includes(o.id) ? "on" : ""} onClick={() => toggleCompare(o.id)}>
                    <span className="seg-dot" style={{ background: compareSet.includes(o.id) ? colorDe(o.id) : "transparent", borderColor: colorDe(o.id) }}></span>
                    {o.t}
                  </button>
                ))}
              </div>
            </div>

            <div className="control">
              <label>Capital a invertir
                <input className="cap-input mono" type="text" inputMode="numeric"
                  style={{ background: "transparent", border: "none", borderBottom: "1px solid #9A7B2A",
                           color: "inherit", font: "inherit", width: "150px", textAlign: "right", marginLeft: "8px", padding: "2px 0" }}
                  value={fmt(capital)}
                  onChange={(e) => { const n = parseInt((e.target.value || "").replace(/[^0-9]/g, ""), 10); setCapital(isNaN(n) ? 0 : n); }} />
              </label>
              <input type="range" min={minCap} max={maxCap} step={step}
                value={Math.min(Math.max(capital, minCap), maxCap)}
                onChange={(e) => setCapital(+e.target.value)} />
              <div className="ticks">
                <span>{fmt(minCap)}</span>
                <span>{fmt(Math.round((minCap + maxCap) / 2))}</span>
                <span>{fmt(maxCap)}</span>
              </div>
            </div>

            <div className="control quick">
              {quickPicks.map((v) => (
                <button key={v} className={capital === v ? "on" : ""} onClick={() => setCapital(v)}>{fmt(v)}</button>
              ))}
            </div>
          </div>

          <div className="calc-result card">
            {compareList.length <= 1 ? (<>
            <div className="result-row">
              <span className="r-label">Tasa / rendimiento</span>
              <span className="r-value mono accent">{result.rate}</span>
            </div>
            <div className="result-row">
              <span className="r-label">Plazo</span>
              <span className="r-value mono">{result.months}</span>
            </div>
            <div className="result-row">
              <span className="r-label">Ganancia bruta</span>
              <span className="r-value mono">{fmt(Math.round(result.gain))}</span>
            </div>
            <div className="result-row big">
              <span className="r-label">Total al cierre</span>
              <span className="r-value mono accent">{fmt(Math.round(result.total))}</span>
            </div>
            <div className="result-bar">
              <div className="bar-track">
                <div className="bar-fill" style={{ width: Math.min(100, result.pct) + "%" }}></div>
              </div>
              <span className="bar-pct mono">+{result.pct.toFixed(1)}%</span>
            </div>
            <p className="small muted">Proyección sobre tasa preferente / plusvalía bruta. Antes de inflación e ISR. Sujeto a contrato escriturado.</p>
            <button className="calc-pdf-cta" onClick={descargarFicha}>↓ Descargar mi simulación (PDF)</button>
            </>) : (<>
            <div className="result-row">
              <span className="r-label">Comparando</span>
              <span className="r-value mono accent">{compareList.length} vehículos</span>
            </div>
            <div className="cmp-cards">
              {compareList.map((v) => (
                <div className="cmp-card" key={v.id}>
                  <div className="cmp-card-top">
                    <span className="cmp-dot" style={{ background: v.color }}></span>
                    <span className="cmp-name mono">{v.nombre}</span>
                    <span className="cmp-total mono accent">{fmt(Math.round(v.total))}</span>
                  </div>
                  <div className="cmp-card-sub mono muted">+{fmt(Math.round(v.gain))} · {Math.round(v.plazoMeses)}m · +{Math.round((v.total / capital - 1) * 100)}%</div>
                </div>
              ))}
            </div>
            <p className="small muted">Proyección bruta antes de inflación e ISR. Mismo capital para todos: {fmt(capital)}.</p>
            <button className="calc-pdf-cta" onClick={descargarFicha}>↓ Descargar simulación de {compareList[0] ? compareList[0].nombre : ""} (PDF)</button>
            </>)}
          </div>
        </div>

        <div className="calc-chart card">
          <div className="cchart-head">
            <span className="kicker">{compareList.length > 1 ? "Proyección comparada" : "Proyección de tu capital"}</span>
            <span className="cchart-range mono muted">{compareList.length > 1 ? compareList.length + " vehículos · " : ""}hasta {Math.round(plazoMax)} meses</span>
          </div>
          <svg className="cchart-svg" viewBox={"0 0 " + CW + " " + CH}>
            <defs>
              <linearGradient id="cchartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {yTicks.map((v, i) => (
              <g key={"y" + i}>
                <line x1={mL} y1={yAt(v)} x2={CW - mR} y2={yAt(v)} stroke="var(--line)" strokeWidth="1" />
                <text x={mL - 8} y={yAt(v) + 3} textAnchor="end" className="cchart-axis">{fmt(Math.round(v))}</text>
              </g>
            ))}
            {compareList.length === 1 && (
              <path d={pathDe(compareList[0].serie) + " L" + xAt(compareList[0].plazoMeses).toFixed(1) + " " + (mT + plotH) + " L" + xAt(0).toFixed(1) + " " + (mT + plotH) + " Z"} fill="url(#cchartFill)" />
            )}
            {compareList.map((v, vi) => {
              const anchor = xAt(v.plazoMeses) > CW - 70 ? "end" : "middle";
              return (
                <g key={"c" + vi}>
                  <path d={pathDe(v.serie)} fill="none" stroke={v.color} strokeWidth="2.5" />
                  <circle cx={xAt(v.plazoMeses)} cy={yAt(v.total)} r="4" fill={v.color} stroke="var(--bg)" strokeWidth="2" />
                  <text x={xAt(v.plazoMeses)} y={yAt(v.total) - 9} textAnchor={anchor} className="cchart-pt">{fmt(Math.round(v.total))}</text>
                </g>
              );
            })}
            <text x={mL} y={mT + plotH + 18} textAnchor="start" className="cchart-axis">Hoy</text>
            <text x={CW - mR} y={mT + plotH + 18} textAnchor="end" className="cchart-axis">Mes {Math.round(plazoMax)}</text>
          </svg>
          <div className="cchart-legend">
            {compareList.map((v, vi) => (
              <span className="cleg" key={"l" + vi}>
                <span className="cleg-dot" style={{ background: v.color }}></span>
                <span className="mono">{v.nombre}</span>
                <span className="mono accent">+{fmt(Math.round(v.gain))}</span>
                <span className="mono muted">· {Math.round(v.plazoMeses)}m</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
};

// =============================================================================
// 6. ESTRATEGIA COMBINADA
// =============================================================================
const SecEstrategia = (props) => {
  const { data } = window.useData();
  const hero  = (data.estrategia && data.estrategia.hero) || {};
  const steps = ((data.estrategia && data.estrategia.steps) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <Shell {...props} related={["calculadora", "casa-alysa", "real-miramar", "garantias"]}>
      <div className="strat">
        <div className="sec-title-row">
          <span className="kicker">{hero.kicker}</span>
          <h1 className="display">{hero.display_line1}<br/>{hero.display_line2}</h1>
          <p className="lead">{hero.lead}</p>
          <div className="stat-row">
            <div className="stat"><span className="big mono">{hero.stat_1_value}</span><span className="mini">{hero.stat_1_label}</span></div>
            <div className="stat"><span className="big mono">{hero.stat_2_value}</span><span className="mini">{hero.stat_2_label}</span></div>
            <div className="stat"><span className="big mono">{hero.stat_3_value}</span><span className="mini">{hero.stat_3_label}</span></div>
            <div className="stat"><span className="big mono accent">{hero.stat_4_value}</span><span className="mini">{hero.stat_4_label}</span></div>
          </div>
        </div>

        <section className="block">
          <h2 className="block-title">Línea de tiempo de la estrategia</h2>
          <div className="timeline">
            {steps.map((s, i) => (
              <div key={i} className="tl-step">
                <div className="tl-marker">
                  <span className="tl-num mono">{i + 1}</span>
                </div>
                <div className="tl-body">
                  <span className="tl-mes mono accent">{s.mes}</span>
                  <span className="tl-title">{s.titulo}</span>
                  <span className="tl-note muted small">{s.note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
};

// =============================================================================
// 7. GARANTÍAS
// =============================================================================
const SecGarantias = (props) => {
  const { data } = window.useData();
  const hero  = (data.garantias && data.garantias.hero) || {};
  const cards = ((data.garantias && data.garantias.cards) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <Shell {...props} related={["casa-alysa", "real-miramar", "decision"]}>
      <div className="gar">
        <div className="sec-title-row">
          <span className="kicker">{hero.kicker}</span>
          <h1 className="display">{hero.display_line1}<br/>{hero.display_line2}</h1>
          <p className="lead">{hero.lead}</p>
        </div>

        <div className="gar-grid">
          {cards.map((g) => (
            <article key={g.numero} className="gar-card">
              <span className="gar-num mono">{g.numero}</span>
              <h3>{g.titulo}</h3>
              <p>{g.cuerpo}</p>
            </article>
          ))}
        </div>
      </div>
    </Shell>
  );
};

// =============================================================================
// 8. CRONOGRAMA
// =============================================================================
const SecCronograma = (props) => {
  const { data } = window.useData();
  const cr = data.cronograma || {};
  const hero          = cr.hero || {};
  const mesesSheet    = (cr.meses || []).slice().sort((a, b) => a.mes - b.mes);
  const numHitos = (arr) => (arr || []).map((h) => ({ ...h, mes: Number(h.mes) }))
    .filter((h) => Number.isFinite(h.mes)).sort((a, b) => a.mes - b.mes);
  const alysaHitos    = numHitos(cr.alysa_hitos);
  const miramarHitos  = numHitos(cr.miramar_hitos);
  const bulletsAlysa  = ((cr.bullets_alysa) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const bulletsMir    = ((cr.bullets_miramar) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const dunasHitos    = numHitos(cr.dunas_hitos);
  const bulletsDunas  = ((cr.bullets_dunas) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const quote         = (cr.quote && cr.quote.quote) || "";

  const TOTAL = hero.total_meses || 24;
  const pct = (m) => (m / TOTAL) * 100;

  // Referencia del día actual: se calcula al abrir, nunca se desfasa.
  // Ancla = hero.fecha_inicio del Sheet, o el ajuste local si el Sheet no la trae
  // (permite corregir el cronograma sin depender de Google).
  const hoy = new Date();
  const hoyTexto = hoy.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  // Este cronograma es PROSPECTIVO: el "Mes 0" es el momento en que se presenta
  // (los hitos dicen "Mes 0 · HOY"). Por eso, si nadie fija una fecha, el eje
  // arranca en el MES ACTUAL — así la carpeta nunca envejece: se abra cuando se
  // abra, siempre se lee "de hoy en adelante".
  const anclaLocal = window.YDR_ANCLA_CRONO && window.YDR_ANCLA_CRONO.get();
  const anclaTexto = hero.fecha_inicio || anclaLocal || "";
  const autoHoy = !anclaTexto;
  const f0 = anclaTexto
    ? new Date(String(anclaTexto).slice(0, 10) + "T12:00:00")
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
  const anclaOk = f0 && !isNaN(f0);
  const hoyMes = anclaOk
    ? Math.max(0, Math.min(TOTAL, (hoy.getFullYear() - f0.getFullYear()) * 12 + (hoy.getMonth() - f0.getMonth()) + (hoy.getDate() - f0.getDate()) / 30))
    : null;

  // Eje de tiempo: cuando hay ancla se CALCULA (nunca envejece); si no, se usan
  // las etiquetas escritas en el Sheet, que sí se desfasan con el tiempo.
  const MESES_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const meses = anclaOk
    ? (() => {
        const paso = TOTAL > 18 ? 3 : 2, out = [];
        for (let m = 0; m <= TOTAL; m += paso) {
          const d = new Date(f0.getFullYear(), f0.getMonth() + m, 1);
          out.push({ mes: m, label: MESES_ES[d.getMonth()] + " " + String(d.getFullYear()).slice(2) });
        }
        return out;
      })()
    : mesesSheet;

  return (
    <Shell {...props} related={["casa-alysa", "real-miramar", "estrategia", "decision"]}>
      <div className="crono">
        <div className="sec-title-row">
          <span className="kicker">{hero.kicker}</span>
          <h1 className="display">{hero.display}</h1>
          <p className="lead">{hero.lead}</p>
          <div className="stat-row">
            <div className="stat"><span className="big mono">{hero.stat_1_value}</span><span className="mini">{hero.stat_1_label}</span></div>
            <div className="stat"><span className="big mono">{hero.stat_2_value}</span><span className="mini">{hero.stat_2_label}</span></div>
            <div className="stat"><span className="big mono accent">{hero.stat_3_value}</span><span className="mini">{hero.stat_3_label}</span></div>
            <div className="stat"><span className="big mono accent">{hero.stat_4_value}</span><span className="mini">{hero.stat_4_label}</span></div>
          </div>
        </div>

        <section className="block">
          <h2 className="block-title">Cronograma maestro</h2>
          <p className="cron-hoy-ref small muted">
            Referencia: hoy es <b>{hoyTexto}</b>
            <span className="cron-con-ancla"> · el cronograma corre desde {f0.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}{autoHoy ? " (mes actual)" : (anclaLocal && !hero.fecha_inicio ? " · fecha fijada aquí" : "")}</span>
          </p>
          <div className="cron-chart">
            <div className="cron-grid">
              {hoyMes != null && (
                <div className="cron-today" style={{ left: pct(hoyMes) + "%" }}>
                  <span className="cron-today-tag mono">HOY · {hoyTexto}</span>
                </div>
              )}
              {meses.map((tick) => (
                <div key={tick.mes} className="cron-grid-line" style={{ left: pct(tick.mes) + "%" }}>
                  <span className="cron-grid-month mono">{tick.label}</span>
                </div>
              ))}
              <div className="cron-year-marker" style={{ left: pct(12) + "%" }}>
                <span className="ymk-tag mono">Año 1</span>
              </div>
              <div className="cron-year-marker" style={{ left: pct(24) + "%" }}>
                <span className="ymk-tag mono">Año 2</span>
              </div>
            </div>

            <div className="cron-row">
              <div className="cron-row-label">
                <span className="crl-name">Casa Alysa</span>
                <span className="crl-sub mono">Yield · 8m</span>
              </div>
              <div className="cron-row-track">
                <div className="cron-bar alysa" style={{ left: pct(0) + "%", width: (pct(10) - pct(0)) + "%" }}></div>
                {alysaHitos.map((h) => (
                  <div key={h.mes} className={"cron-hito alysa-hito" + (h.mes === 0 ? " hi" : "")}
                       style={{ left: pct(h.mes) + "%" }}>
                    <span className="ht-dot"></span>
                    <span className="ht-label">
                      <span className="ht-title">{h.label}</span>
                      {h.note && <span className="ht-note mono">{h.note}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="cron-row">
              <div className="cron-row-label">
                <span className="crl-name">Real Miramar</span>
                <span className="crl-sub mono">Plusvalía · 24m+</span>
              </div>
              <div className="cron-row-track">
                <div className="cron-bar miramar" style={{ left: pct(0) + "%", width: (pct(24) - pct(0)) + "%" }}></div>
                <div className="cron-plus-seg" style={{ left: pct(12) + "%", width: (pct(24) - pct(12)) + "%" }}>
                  <span className="cps-tag">+10% / año</span>
                </div>
                {miramarHitos.map((h) => (
                  <div key={h.mes} className={"cron-hito miramar-hito" + (h.hi ? " hi" : "") + (h.bigDot ? " big" : "")}
                       style={{ left: pct(h.mes) + "%" }}>
                    <span className="ht-dot"></span>
                    <span className="ht-label">
                      <span className="ht-title">{h.label}</span>
                      <span className="ht-price mono">{h.price}</span>
                      <span className={"ht-gain mono" + (h.hi ? " hi" : "")}>{h.gain}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {dunasHitos.length > 0 && (
              <div className="cron-row">
                <div className="cron-row-label">
                  <span className="crl-name">Dunas Kino</span>
                  <span className="crl-sub mono">Plusvalía · 12m</span>
                </div>
                <div className="cron-row-track">
                  <div className="cron-bar dunas" style={{ left: pct(0) + "%", width: (pct(12) - pct(0)) + "%" }}></div>
                  {dunasHitos.map((h) => (
                    <div key={h.mes} className={"cron-hito dunas-hito" + (h.mes === 0 ? " hi" : "")}
                         style={{ left: pct(h.mes) + "%" }}>
                      <span className="ht-dot"></span>
                      <span className="ht-label">
                        <span className="ht-title">{h.label}</span>
                        {h.note && <span className="ht-note mono">{h.note}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={"block " + (bulletsDunas.length > 0 ? "cron-bullets-3" : "two-col")}>
          <div>
            <h2 className="block-title">Hitos Casa Alysa</h2>
            <ul className="bullets">
              {bulletsAlysa.map((b) => (
                <li key={b.order}><strong>{b.mes_label}</strong> · {b.titulo}, {b.descripcion}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="block-title">Hitos Real Miramar</h2>
            <ul className="bullets">
              {bulletsMir.map((b) => (
                <li key={b.order}>
                  <strong>{b.mes_label}</strong> · {b.titulo} · <span className="accent">{b.precio}</span>{" "}
                  {b.extra && <span className="muted small">{b.extra}</span>}
                </li>
              ))}
            </ul>
          </div>
          {bulletsDunas.length > 0 && (
            <div>
              <h2 className="block-title">Hitos Dunas Kino</h2>
              <ul className="bullets">
                {bulletsDunas.map((b) => (
                  <li key={b.order}><strong>{b.mes_label}</strong> · {b.titulo}{b.descripcion ? ", " + b.descripcion : ""}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {quote && (
          <div className="pull-quote">
            <span className="quote-mark">"</span>
            {quote}
          </div>
        )}
      </div>
    </Shell>
  );
};

// =============================================================================
// 9. DECISIÓN
// =============================================================================
const SecDecision = (props) => {
  const { data } = window.useData();
  const hero  = (data.decision && data.decision.hero) || {};
  const paths = (data.decision && data.decision.paths) || [];

  return (
    <Shell {...props} related={["contacto", "garantias", "casa-alysa", "real-miramar"]}>
      <div className="dec">
        <div className="sec-title-row">
          <span className="kicker">{hero.kicker}</span>
          <h1 className="display">{hero.display_line1}<br/>{hero.display_line2}</h1>
          <p className="lead">{hero.lead}</p>
        </div>

        <div className="path-grid">
          {paths.map((p) => (
            <article key={p.letra} className={"path-card" + (p.strong ? " strong" : "")}>
              <span className="path-letter mono">{p.letra}</span>
              <h3>{p.titulo}</h3>
              <span className="path-sub muted">{p.sub}</span>
              <p>{p.descripcion}</p>
              {p.url
                ? <a href={linkArchivo(p.url)} target="_blank" rel="noreferrer" className="path-cta">{p.cta} <IconArrow size={14} sw={2} /></a>
                : <button className="path-cta">{p.cta} <IconArrow size={14} sw={2} /></button>
              }
            </article>
          ))}
        </div>
      </div>
    </Shell>
  );
};

// =============================================================================
// 10. CONTACTO
// =============================================================================
const SecContacto = (props) => {
  const { data } = window.useData();
  const hero    = (data.contacto && data.contacto.hero) || {};
  const asesor  = (data.contacto && data.contacto.asesor) || {};
  const docs    = ((data.contacto && data.contacto.docs) || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const cta     = (data.contacto && data.contacto.cta) || {};

  return (
    <Shell {...props} related={["decision", "diagnostico"]}>
      <div className="contact">
        <div className="sec-title-row">
          <span className="kicker">{hero.kicker}</span>
          <h1 className="display">{hero.display_line1}<br/>{hero.display_line2}</h1>
          <p className="lead">{hero.lead}</p>
        </div>

        <div className="contact-grid">
          <article className="contact-card">
            <span className="kicker">{asesor.kicker}</span>
            <h3>{asesor.nombre}</h3>
            <span className="role muted">{asesor.rol}</span>
            <ul className="contact-list">
              <li><span className="muted">WhatsApp</span><span className="mono">{asesor.whatsapp}</span></li>
              <li><span className="muted">Correo</span><span className="mono">{asesor.correo}</span></li>
              <li><span className="muted">Web</span><span className="mono">{asesor.web}</span></li>
              <li><span className="muted">Oficina</span><span>{asesor.oficina}</span></li>
            </ul>
          </article>

          <article className="contact-card">
            <span className="kicker">Material para llevar</span>
            <h3>Documentos disponibles</h3>
            <ul className="doc-list">
              {docs.map((d) => (
                <li key={d.order}>
                  {d.url
                    ? <a href={linkArchivo(d.url)} target="_blank" rel="noreferrer"><span>{d.titulo}</span><span className="muted small">{d.meta}</span></a>
                    : (<><span>{d.titulo}</span><span className="muted small">{d.meta}</span></>)
                  }
                </li>
              ))}
            </ul>
          </article>

          <article className="contact-card cta-card">
            <h3>{cta.titulo}</h3>
            <p>{cta.cuerpo}</p>
            {cta.url
              ? <a href={linkArchivo(cta.url)} target="_blank" rel="noreferrer" className="path-cta">{cta.cta} <IconArrow size={14} sw={2} /></a>
              : <button className="path-cta">{cta.cta} <IconArrow size={14} sw={2} /></button>
            }
          </article>
        </div>
      </div>
    </Shell>
  );
};

// =============================================================================
// PROYECTO (genérico) — render dinámico de proyectos del tab `Proyectos`
// modelo: "simple" | "coinversion" | "plusvalia"
// =============================================================================
const SecProyecto = (props) => {
  const p = props.tile || {};
  const modelo = p.modelo || "simple";
  const tiers  = (p.tiers || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const porQue = p.por_que || [];
  const como   = p.como || [];
  const related = (p.related ? String(p.related).split("|").map((x) => x.trim()).filter(Boolean) : null) || ["calculadora", "garantias", "decision", "contacto"];

  return (
    <Shell {...props} related={related}>
      <div className="proj">
        <div className="proj-hero alysa-hero">
          <div className="hero-text">
            <span className="kicker">{p.kicker}</span>
            <h1 className="display">{p.hero_display || p.nombre}</h1>
            <p className="lead">{p.hero_lead}</p>
            <div className="stat-row">
              {p.stat_1_value && <div className="stat"><span className="big mono">{p.stat_1_value}</span><span className="mini">{p.stat_1_label}</span></div>}
              {p.stat_2_value && <div className="stat"><span className="big mono">{p.stat_2_value}</span><span className="mini">{p.stat_2_label}</span></div>}
              {p.stat_3_value && <div className="stat"><span className="big mono">{p.stat_3_value}</span><span className="mini">{p.stat_3_label}</span></div>}
              {p.stat_4_value && <div className="stat"><span className="big mono accent">{p.stat_4_value}</span><span className="mini">{p.stat_4_label}</span></div>}
            </div>
          </div>
          <div className="hero-img">
            {(p.img_hero_url || p.img_url) ? (
              <img src={p.img_hero_url || p.img_url} alt={p.nombre} className="hero-img-real" />
            ) : (
              <div className="img-placeholder">
                <span className="ph-label">{p.nombre}</span>
                <span className="ph-sub">— {p.ubicacion || ""} —</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de tiers — solo coinversión escalonada */}
        {modelo === "coinversion" && tiers.length > 0 && (
          <section className="block">
            <h2 className="block-title">Estructura escalonada · más capital, mejor tasa</h2>
            <table className="comp-table">
              <thead>
                <tr><th>Capital</th><th className="num">Tasa anual</th><th className="num">Retorno 6m</th><th className="num">Retorno 8m</th><th className="num">Total 8m</th></tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.capital} className={t.star ? "star" : ""}>
                    <td className="mono">{t.star && <span className="star-mark">★</span>}{fmt(t.capital)}</td>
                    <td className="num mono">{Number(t.rate).toFixed(2)}%</td>
                    <td className="num mono muted">{fmt(t.retorno6)}</td>
                    <td className="num mono muted">{fmt(t.retorno8)}</td>
                    <td className="num mono accent">{fmt(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {p.tiers_nota && <p className="small muted">{p.tiers_nota}</p>}
          </section>
        )}

        {/* Lotes — solo plusvalía (reusa el LoteSelector si el proyecto trae lotes) */}
        {modelo === "plusvalia" && (p.lotes || []).length > 0 && (
          <LoteSelector tile={p} />
        )}

        {/* Lote ejemplo (caso fundador) — derivado de los precios y el tamaño de lote */}
        {modelo === "plusvalia" && p.lote_ejemplo && (p.lote_ejemplo.filas || []).length > 0 && (
          <details className="rm-extras">
            <summary>{p.lote_ejemplo.titulo || "Caso fundador"}</summary>
            <table className="kv" style={{ marginTop: "12px" }}>
              <tbody>
                {p.lote_ejemplo.filas.map((r, i) => (
                  <tr key={i} className={r.highlight ? "hi" : ""}>
                    <td>{r.label}</td>
                    <td className={"num mono" + (r.highlight ? " accent" : "")}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}

        {/* Por qué / Cómo */}
        {(porQue.length > 0 || como.length > 0) && (
          <section className="block two-col">
            {porQue.length > 0 && (
              <div>
                <h2 className="block-title">Por qué</h2>
                <ul className="bullets">{porQue.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: typeof b === "string" ? b : (b.html || ((b.strong ? "<strong>" + b.strong + "</strong> — " : "") + (b.text || ""))) }} />)}</ul>
              </div>
            )}
            {como.length > 0 && (
              <div>
                <h2 className="block-title">Cómo entras</h2>
                <ul className="bullets">{como.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: typeof b === "string" ? b : (b.html || b.text || "") }} />)}</ul>
              </div>
            )}
          </section>
        )}

        {/* Material del proyecto — PDF de propuesta, video de avance, CTA */}
        {(p.presentacion_url || p.pdf_dossier_url || p.video_url || p.cta_url) && (
          <section className="block">
            <h2 className="block-title">Material del proyecto</h2>
            <div className="proj-action-row">
              {p.presentacion_url && (
                <a className="path-cta" href={matUrl(p, "presentacion_url")} target="_blank" rel="noreferrer">
                  Ver presentación completa <IconArrow size={14} sw={2} />
                </a>
              )}
              {p.pdf_dossier_url && (
                <a className="path-cta" href={matUrl(p, "pdf_dossier_url")} target="_blank" rel="noreferrer">
                  Ver propuesta (PDF) <IconArrow size={14} sw={2} />
                </a>
              )}
              {p.video_url && (
                <a className="path-cta" href={matUrl(p, "video_url")} target="_blank" rel="noreferrer">
                  Ver avance de obra <IconArrow size={14} sw={2} />
                </a>
              )}
              {p.cta_url && (
                <a className="path-cta" href={linkArchivo(p.cta_url)} target="_blank" rel="noreferrer">
                  {p.cta_text || "Más información"} <IconArrow size={14} sw={2} />
                </a>
              )}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
};

// =============================================================================
// ACUERDO DE PAGO — editor + documento "Promesa de Pago" + PDF 1 clic
// Folio automático por iniciales. Documento de flujo continuo (paginación limpia).
// =============================================================================
const fmtMoney = (n) => "$" + (Math.round(parseFloat(n) || 0)).toLocaleString("en-US");
const fmtTotal = (n) => fmtMoney(n) + " MXN";
const AP_MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const AP_NUMS  = ["Cero","Un","Dos","Tres","Cuatro","Cinco","Seis","Siete","Ocho","Nueve","Diez","Once","Doce"];
const apNumPalabra = (n) => AP_NUMS[n] || String(n);
const apFmtFecha = (iso) => {
  if (!iso) return "";
  const p = String(iso).split("-").map(Number);
  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return iso;
  return p[2] + " " + AP_MESES[p[1] - 1] + " " + p[0];
};
const apFmtFechaLarga = (iso) => {
  if (!iso) return "";
  const p = String(iso).split("-").map(Number);
  if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return iso;
  return p[2] + " de " + AP_MESES[p[1] - 1] + " de " + p[0];
};
const apParsePct = (s) => {
  if (s === 0) return 0;
  if (!s) return null;
  const m = String(s).trim().match(/^(\d+(?:\.\d+)?)\s*%?$/);
  return m ? parseFloat(m[1]) : null;
};
const apIniciales = (nombre) => {
  const p = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "XX";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[1][0]).toUpperCase();
};

const SecAcuerdoPagos = (props) => {
  const { data } = window.useData();
  const cfg = (data && data.config) || {};

  const AP_DRAFT_KEY = "ydr_acuerdo_draft_v1";
  const freshDoc = () => ({
    inversionista: "", lugar: "Hermosillo, Sonora, México", emitido: "",
    folio_prefijo: "CA", folio_num: "01", subtitulo: "Coinversión escriturada en Casa Alysa",
    intro_aportacion: "Cuenta exclusiva del proyecto. Cada peso trazable.",
    aportaciones: [
      { fecha: "", concepto: "Aportación inicial", monto: "" },
      { fecha: "", concepto: "Aportación 2 de 4", monto: "" },
      { fecha: "", concepto: "Aportación 3 de 4", monto: "" },
      { fecha: "", concepto: "Aportación final", monto: "" },
    ],
    intro_rendimiento: "25% anual preferente, prorrateado según el momento real de venta.",
    tasa_anual: "25",
    rendimientos: [
      { momento: "Mes 1 - 6", tasa: "12.50%", total_manual: "" },
      { momento: "Mes 6 - 8", tasa: "16.67%", total_manual: "" },
      { momento: "Mes 9 - 12", tasa: "25.00%", total_manual: "" },
      { momento: "Mes 13 - 24", tasa: "27% - 50%", total_manual: "0.0685% adicional por día" },
    ],
    nota_rendimiento: "Si la venta excede 12 meses, cada día acumula 0.0685% adicional sobre el capital, equivalente al 25% anual del siguiente periodo, proporcional.",
    referencias: [{ meses: "13" }, { meses: "18" }, { meses: "24" }],
    banco: cfg.dep_banco || "BBVA", beneficiario: cfg.dep_beneficiario || "YODESARROLLO SAPI DE CV",
    cuenta: cfg.dep_cuenta || "011628459", clabe: cfg.dep_clabe || "012760001186284598",
    concepto_dep: "",
    nota_dep: "Cada pago deberá notificarse enviando el comprobante correspondiente para su registro y trazabilidad dentro del proyecto.",
    texto_conformidad: "Las partes manifiestan su conformidad con el calendario de aportaciones, la estructura de rendimiento y las garantías arriba descritas. Este documento se complementará con el contrato definitivo escriturado ante notario, mismo que prevalecerá en caso de discrepancia.",
    firma_rep: cfg.firma_rep || "Alejandro Puebla Gayón",
  });

  // Borrador persistente: sobrevive recargas del navegador (móvil sobre todo)
  const [d, setD] = React.useState(() => {
    try { const s = localStorage.getItem(AP_DRAFT_KEY); if (s) return Object.assign(freshDoc(), JSON.parse(s)); } catch (e) {}
    return freshDoc();
  });
  React.useEffect(() => {
    try { localStorage.setItem(AP_DRAFT_KEY, JSON.stringify(d)); } catch (e) {}
  }, [d]);
  const limpiarBorrador = () => {
    if (window.confirm("¿Vaciar todos los campos y empezar un acuerdo nuevo?")) {
      try { localStorage.removeItem(AP_DRAFT_KEY); } catch (e) {}
      setD(freshDoc());
    }
  };

  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const setRow = (arr, i, k, v) => setD((p) => ({ ...p, [arr]: p[arr].map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addRow = (arr, tpl) => setD((p) => ({ ...p, [arr]: [...p[arr], tpl] }));
  const delRow = (arr, i) => setD((p) => ({ ...p, [arr]: p[arr].filter((_, j) => j !== i) }));

  const capital = d.aportaciones.reduce((s, a) => s + (parseFloat(a.monto) || 0), 0);
  const tasaAnual = parseFloat(d.tasa_anual) || 0;
  const anioFolio = (d.emitido && d.emitido.slice(0, 4)) || String(new Date().getFullYear());
  const folio = (d.folio_prefijo || "CA") + "-" + apIniciales(d.inversionista) + "-" + anioFolio + "-" + (d.folio_num || "01");

  const rendTotal = (r) => {
    if (r.total_manual && String(r.total_manual).trim()) return r.total_manual;
    const pct = apParsePct(r.tasa);
    return pct != null ? fmtTotal(capital * (1 + pct / 100)) : "";
  };
  const refCalc = (meses) => {
    const m = parseFloat(meses) || 0;
    if (!m) return { label: "", rend: "", total: "" };
    const rendPct = tasaAnual * m / 12;
    return { label: m + " meses", rend: "+" + rendPct.toFixed(2) + "%", total: fmtMoney(capital * (1 + rendPct / 100)) };
  };

  const descargar = () => {
    const doc = document.getElementById("ap-doc");
    if (!doc) return;
    const nombre = "Promesa-de-Pago-" + (d.inversionista || "inversionista").replace(/[^a-zA-Z0-9]+/g, "-");
    const sheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(function (n) { return n.outerHTML; }).join("");
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(iframe);
    const idoc = iframe.contentWindow.document;
    idoc.open();
    const printCss = "<style>"
      + "@page{size:A4;margin:14mm;}"
      + "html,body{margin:0;padding:0;background:#fff;height:auto!important;overflow:visible!important;}"
      + "#ap-doc,#ap-doc .ap-sheet{box-shadow:none!important;border:0!important;margin:0!important;padding:0!important;"
      + "width:auto!important;max-width:none!important;height:auto!important;max-height:none!important;min-height:0!important;"
      + "overflow:visible!important;transform:none!important;}"
      + "#ap-doc *{overflow:visible!important;}"
      + "#ap-doc .ap-table,#ap-doc .ap-block,#ap-doc .ap-sec,#ap-doc tr,#ap-doc .ap-sign,#ap-doc .ap-meta,#ap-doc .ap-total-row{break-inside:avoid;page-break-inside:avoid;}"
      + "#ap-doc h1,#ap-doc h3{break-after:avoid;page-break-after:avoid;}"
      + "#ap-doc thead{display:table-header-group;}"
      + "</style>";
    idoc.write("<!doctype html><html><head><title>" + nombre + "</title>" + sheets + printCss + "</head><body>" + doc.outerHTML + "</body></html>");
    idoc.close();
    setTimeout(function () { try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch (e) {} setTimeout(function () { iframe.remove(); }, 1500); }, 500);
  };

  const fld = (label, key, ph, type) => (
    <label className="ap-fld">
      <span>{label}</span>
      <input type={type || "text"} value={d[key]} placeholder={ph || ""} onChange={(e) => set(key, e.target.value)} />
    </label>
  );

  return (
    <Shell {...props} related={["calculadora", "garantias", "contacto"]}>
      <div className="ap-wrap">

        <div className="ap-form">
          <div className="ap-form-head">
            <h2>Datos del acuerdo</h2>
            <button className="ap-clear" onClick={limpiarBorrador}>Nuevo</button>
            <button className="ap-download" onClick={descargar}>Descargar PDF <IconArrow size={14} sw={2} /></button>
          </div>
          <p className="ap-hint">Llena los campos; el documento se arma solo. Al dar <strong>Descargar PDF</strong> se abre el diálogo de impresión: elige <strong>“Guardar como PDF”</strong> y activa <strong>Gráficos de fondo</strong>.</p>

          <div className="ap-grid2">
            {fld("Inversionista", "inversionista", "Nombre completo")}
            {fld("Emitido", "emitido", "", "date")}
            {fld("Prefijo folio", "folio_prefijo", "CA")}
            {fld("Consecutivo", "folio_num", "01")}
            {fld("Tasa anual %", "tasa_anual", "25")}
          </div>
          <div className="ap-folio-preview">Folio: <strong>{folio}</strong></div>
          {fld("Lugar", "lugar")}
          {fld("Subtítulo", "subtitulo")}

          <div className="ap-block">
            <div className="ap-block-head"><span>I · Aportaciones</span>
              <button onClick={() => addRow("aportaciones", { fecha: "", concepto: "", monto: "" })}>+ pago</button>
            </div>
            {fld("Bajada (va después de \"N pagos.\")", "intro_aportacion")}
            {d.aportaciones.map((a, i) => (
              <div className="ap-row ap-row--ap" key={i}>
                <input type="date" className="c-f" value={a.fecha} onChange={(e) => setRow("aportaciones", i, "fecha", e.target.value)} />
                <input className="c-c" value={a.concepto} placeholder="Concepto" onChange={(e) => setRow("aportaciones", i, "concepto", e.target.value)} />
                <input className="c-m" value={a.monto} placeholder="Monto $" inputMode="numeric" onChange={(e) => setRow("aportaciones", i, "monto", e.target.value)} />
                <button className="ap-del" onClick={() => delRow("aportaciones", i)}>×</button>
              </div>
            ))}
            <div className="ap-total-line">{apNumPalabra(d.aportaciones.length)} pagos · Total: <strong>{fmtTotal(capital)}</strong></div>
          </div>

          <div className="ap-block">
            <div className="ap-block-head"><span>II · Rendimiento</span>
              <button onClick={() => addRow("rendimientos", { momento: "", tasa: "", total_manual: "" })}>+ fila</button>
            </div>
            {fld("Bajada", "intro_rendimiento")}
            {d.rendimientos.map((r, i) => (
              <div className="ap-row" key={i}>
                <input className="c-f" value={r.momento} placeholder="Mes 1 - 6" onChange={(e) => setRow("rendimientos", i, "momento", e.target.value)} />
                <input className="c-c" value={r.tasa} placeholder="Tasa %" onChange={(e) => setRow("rendimientos", i, "tasa", e.target.value)} />
                <input className="c-m" value={r.total_manual} placeholder={rendTotal(r) || "auto"} onChange={(e) => setRow("rendimientos", i, "total_manual", e.target.value)} />
                <button className="ap-del" onClick={() => delRow("rendimientos", i)}>×</button>
              </div>
            ))}
            <p className="ap-microhint">El "Total a recibir" se calcula solo (tasa × capital). El último campo solo se llena para texto especial.</p>
            {fld("Nota", "nota_rendimiento")}
          </div>

          <div className="ap-block">
            <div className="ap-block-head"><span>Tabla de referencia (meses)</span>
              <button onClick={() => addRow("referencias", { meses: "" })}>+ fila</button>
            </div>
            {d.referencias.map((r, i) => {
              const c = refCalc(r.meses);
              return (
                <div className="ap-row ap-row--ref" key={i}>
                  <input className="c-f" value={r.meses} placeholder="meses" inputMode="numeric" onChange={(e) => setRow("referencias", i, "meses", e.target.value)} />
                  <span className="ap-calc">{c.total || "—"}</span>
                  <span className="ap-calc">{c.rend || "—"}</span>
                  <button className="ap-del" onClick={() => delRow("referencias", i)}>×</button>
                </div>
              );
            })}
            <p className="ap-microhint">Solo escribes los meses; el total y el rendimiento se calculan.</p>
          </div>

          <div className="ap-block">
            <div className="ap-block-head"><span>III · Cuenta de depósito</span></div>
            <div className="ap-grid2">
              {fld("Banco", "banco")}{fld("Beneficiario", "beneficiario")}
              {fld("Cuenta", "cuenta")}{fld("CLABE", "clabe")}
            </div>
            {fld("Concepto sugerido", "concepto_dep", "Aportación Casa Alysa - Nombre - Folio")}
            {fld("Nota", "nota_dep")}
          </div>

          <div className="ap-block">
            <div className="ap-block-head"><span>IV · Conformidad</span></div>
            {fld("Texto", "texto_conformidad")}
            {fld("Representante legal", "firma_rep")}
          </div>
        </div>

        <div className="ap-preview-col">
          <div id="ap-doc" className="ap-doc">
            <div className="ap-sheet">
            <div className="ap-doc-head">
              <img src="assets/logo_dark.png" alt="Yodesarrollo" className="ap-logo" onError={(e) => { e.target.style.display = 'none'; }} />
              <span className="ap-folio">Folio {folio}</span>
            </div>
            <hr className="ap-rule" />

            <h1 className="ap-title">PROMESA DE PAGO</h1>
            <div className="ap-title-dash"></div>
            <p className="ap-subtitle">{d.subtitulo}</p>

            <div className="ap-meta">
              <div><span className="ap-meta-k">Para</span><span className="ap-meta-v">{d.inversionista || "—"}</span></div>
              <div><span className="ap-meta-k">Emitido</span><span className="ap-meta-v">{apFmtFechaLarga(d.emitido) || "—"}</span></div>
              <div><span className="ap-meta-k">Lugar</span><span className="ap-meta-v">{d.lugar}</span></div>
              <div><span className="ap-meta-k">Folio</span><span className="ap-meta-v">{folio}</span></div>
            </div>

            <div className="ap-sec"><span className="ap-num">I</span><h3>Tu aportación.</h3></div>
            <p className="ap-bajada">{apNumPalabra(d.aportaciones.length)} pagos. {d.intro_aportacion}</p>
            <table className="ap-table ap-table--navy">
              <thead><tr><th>No.</th><th>Fecha</th><th>Concepto</th><th className="r">Monto</th></tr></thead>
              <tbody>
                {d.aportaciones.map((a, i) => (
                  <tr key={i}><td>{String(i + 1).padStart(2, "0")}</td><td>{apFmtFecha(a.fecha)}</td><td>{a.concepto}</td><td className="r">{a.monto ? fmtMoney(a.monto) : ""}</td></tr>
                ))}
                <tr className="ap-total-row"><td colSpan="3" className="r"><strong>Total aportación íntegra</strong></td><td className="r"><strong>{fmtTotal(capital)}</strong></td></tr>
              </tbody>
            </table>

            <div className="ap-sec"><span className="ap-num">II</span><h3>Tu rendimiento.</h3></div>
            <p className="ap-bajada">{d.intro_rendimiento}</p>
            <table className="ap-table ap-table--navy">
              <thead><tr><th>Momento de salida</th><th>Tasa total</th><th>Total a recibir</th></tr></thead>
              <tbody>
                {d.rendimientos.map((r, i) => (<tr key={i}><td>{r.momento}</td><td>{r.tasa}</td><td>{rendTotal(r)}</td></tr>))}
              </tbody>
            </table>
            {d.nota_rendimiento && <p className="ap-fineprint">{d.nota_rendimiento}</p>}
            <table className="ap-table ap-table--gray">
              <thead><tr><th>Referencia</th><th>Total a recibir</th><th>Rendimiento</th></tr></thead>
              <tbody>
                {d.referencias.map((r, i) => { const c = refCalc(r.meses); return <tr key={i}><td>{c.label}</td><td>{c.total}</td><td>{c.rend}</td></tr>; })}
              </tbody>
            </table>
            </div>

            <div className="ap-sheet ap-sheet--2">
            <div className="ap-sec"><span className="ap-num">III</span><h3>Cuenta de depósito.</h3></div>
            <p className="ap-bajada">Las aportaciones deberán realizarse únicamente a la siguiente cuenta bancaria del proyecto:</p>
            <div className="ap-bank">
              <div><span className="ap-meta-k">Banco</span><span className="ap-meta-v">{d.banco}</span></div>
              <div><span className="ap-meta-k">Beneficiario</span><span className="ap-meta-v">{d.beneficiario}</span></div>
              <div><span className="ap-meta-k">Cuenta</span><span className="ap-meta-v">{d.cuenta}</span></div>
              <div><span className="ap-meta-k">CLABE</span><span className="ap-meta-v">{d.clabe}</span></div>
            </div>
            {d.concepto_dep && <p className="ap-concepto"><strong>Concepto sugerido:</strong> {d.concepto_dep}</p>}
            {d.nota_dep && <p className="ap-bajada">{d.nota_dep}</p>}

            <div className="ap-sheet-bottom">
            <div className="ap-sec"><span className="ap-num">IV</span><h3>Construyamos juntos.</h3></div>
            <p className="ap-bajada">{d.texto_conformidad}</p>
            <div className="ap-signs">
              <div className="ap-sign"><div className="ap-sign-line"></div><span className="ap-sign-name">{d.firma_rep}</span><span className="ap-sign-rol">Yodesarrollo SAPI de C.V.</span><span className="ap-sign-rol">Representante Legal</span></div>
              <div className="ap-sign"><div className="ap-sign-line"></div><span className="ap-sign-name">{d.inversionista || "Inversionista"}</span><span className="ap-sign-rol">Inversionista</span><span className="ap-sign-rol">Firma de conformidad</span></div>
            </div>

            <div className="ap-doc-footer">
              <strong>{d.beneficiario}</strong>
              <span>{d.lugar}</span>
              <span>Documento confidencial · Folio {folio}{d.emitido ? " · Emitido el " + apFmtFechaLarga(d.emitido) : ""}</span>
            </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
};

// =============================================================================
// 13. ¿QUÉ ES UN PPP? — Plan de Potencial Patrimonial
// Sheet-driven (tab `ppp` del Sheet) con respaldo en código: si el Sheet aún no
// trae la pestaña, la sección se ve completa igual. Regla: lo que llegue del
// Sheet SIEMPRE gana sobre el respaldo.
// =============================================================================
// Liga medible al formulario "Despierta tu Terreno". Convención YOD de UTMs:
// utm_source identifica la herramienta, utm_medium el contexto. Con esto el CRM
// distingue al lead que nació en una presentación (este board) del que llegó por
// redes. El formulario captura el origen con lógica de primer toque.
const PPP_CTA_URL = "https://yodesarrollomx.github.io/plan-potencial/?utm_source=yodesarrollo-board&utm_medium=presentacion&utm_campaign=board-ppp";

const PPP_FALLBACK = {
  hero: {
    kicker: "El punto de partida",
    display_line1: "Tu terreno ya sabe lo que quiere ser.",
    display_line2: "Un PPP lo traduce a números.",
    lead: "Un Plan de Potencial Patrimonial (PPP) es un estudio hecho a la medida de UN terreno: qué permite la norma, qué aguantan los servicios, qué pide el mercado — y cuánto vale cada camino. No es una corazonada ni un folleto: es el expediente con el que un propietario decide con datos, antes de mover un solo peso.",
    stat_1_value: "1", stat_1_label: "terreno por estudio",
    stat_2_value: "8", stat_2_label: "servicios auditados con norma",
    stat_3_value: "3+", stat_3_label: "escenarios corridos",
    stat_4_value: "1", stat_4_label: "propuesta concreta",
  },
  pasos: [
    { mes: "Paso 1", titulo: "Nos platicas tu terreno", note: "Ubicación, superficie y qué te gustaría lograr. No necesitas planos ni escrituras para empezar: con el formulario de 5 minutos o una plática alcanza." },
    { mes: "Paso 2", titulo: "Lo corremos en vivo en el YOD OS", note: "En nuestro tablero de Potenciales cargamos tu terreno y sale a la vista, contigo en la pantalla: giros que permite la norma, densidades, y la realidad de agua, energía, drenaje, vialidades y estacionamiento — cada cuadro con su norma citada." },
    { mes: "Paso 3", titulo: "Escenarios con números", note: "¿Residencial, usos mixtos, comercial, logístico? Cada vocación se corre con inversión requerida, absorción del mercado y valor de salida. Se comparan lado a lado y ganan los números, no el gusto." },
    { mes: "Paso 4", titulo: "Expediente y propuesta", note: "Recibes el documento con mapas, cuadros normativos y escenarios comparados, más UNA propuesta concreta. El expediente es tuyo, decidas lo que decidas." },
  ],
  seguimiento: [
    { numero: "✓", accent: "#7fb069", titulo: "Los números dan", cuerpo: "Te presentamos la fórmula de co-desarrollo: normalmente aportas el terreno, participas de cada venta y no inviertes de más ni te endeudas. El proyecto arranca con reglas escritas y lo sigues en un tablero como este: aportaciones, avance y fechas a la vista." },
    { numero: "~", accent: "#d4be8a", titulo: "Dan, pero todavía no", cuerpo: "A veces el terreno vale más esperando con un plan: gestionar el uso de suelo, acercar servicios, madurar la zona. Te decimos exactamente qué le falta, cuánto cuesta lograrlo y le damos seguimiento contigo hasta que los números sí den." },
    { numero: "✕", accent: "#c96e6e", titulo: "No dan — y se dice de frente", cuerpo: "Si desarrollar no conviene, te lo decimos con los datos en la mesa. Te quedas con el expediente y con la verdad. Preferimos un no honesto hoy que un proyecto que truene en obra — así se construye la confianza que buscamos." },
  ],
  diferencias: [
    { numero: "01", titulo: "vs. un avalúo", cuerpo: "El avalúo te dice cuánto vale tu terreno HOY, tal como está. El PPP te dice cuánto puede PRODUCIR: son preguntas distintas, y la segunda suele valer varias veces la primera." },
    { numero: "02", titulo: "vs. una inmobiliaria", cuerpo: "El corredor gana cuando vendes rápido, aunque sea barato. Nosotros ganamos cuando el proyecto gana — por eso nos conviene decirte la verdad sobre el potencial, no apurarte a soltar la tierra." },
    { numero: "03", titulo: "vs. un estudio de mercado", cuerpo: "El estudio genérico habla del sector: 'la vivienda crece 4%'. El PPP habla de TU terreno: qué giro permite TU norma, cuánta agua hay en TU calle, qué absorbe TU zona. Con fuentes citadas, no promedios." },
    { numero: "04", titulo: "vs. un render bonito", cuerpo: "Un render vende ilusión sin corrida financiera. En el PPP el dibujo llega al final: primero la norma, luego el número, y solo entonces la imagen. Si un escenario no aguanta su corrida, no entra al plan." },
  ],
  buscamos: {
    titulo: "Qué estamos buscando",
    cuerpo: "Terrenos con vocación — desde un lote urbano hasta decenas de hectáreas — y propietarios dispuestos a pensar como socios: gente que prefiere entender el potencial de su tierra antes de malvenderla. Si ese eres tú, la evaluación inicial es el primer paso.",
  },
  costo: {
    titulo: "Cuánto cuesta y por qué",
    cuerpo: "La evaluación inicial no cuesta: llenas el formulario y recibes el primer análisis de potencial. El PPP completo se cotiza según superficie y complejidad del terreno — es trabajo de arquitectos e ingeniería normativa hecho a la medida. Y si el proyecto se desarrolla con nosotros, lo invertido en tu PPP se abona al proyecto: el estudio te sale gratis por haber decidido con datos.",
  },
  cta: {
    titulo: "Evalúa tu terreno hoy",
    sub: "5 minutos, sin compromiso y sin costo. Ubicas tu terreno en el mapa, nos cuentas qué buscas y el primer análisis llega a tu correo.",
    boton: "Evaluar mi terreno",
    url: PPP_CTA_URL,
  },
};

const SecPPP = (props) => {
  const { data } = window.useData();
  const d = (data && data.ppp) || {};
  const hero  = { ...PPP_FALLBACK.hero, ...(d.hero || {}) };
  const pasos = (d.pasos && d.pasos.length ? d.pasos : PPP_FALLBACK.pasos).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const segui = (d.seguimiento && d.seguimiento.length ? d.seguimiento : PPP_FALLBACK.seguimiento).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const difs  = (d.diferencias && d.diferencias.length ? d.diferencias : PPP_FALLBACK.diferencias).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const buscamos = { ...PPP_FALLBACK.buscamos, ...(d.buscamos || {}) };
  const costo    = { ...PPP_FALLBACK.costo,    ...(d.costo || {}) };
  const cta      = { ...PPP_FALLBACK.cta,      ...(d.cta || {}) };

  return (
    <Shell {...props} related={["calculadora", "estrategia", "contacto"]}>
      <div className="gar">
        <div className="sec-title-row">
          <span className="kicker">{hero.kicker}</span>
          <h1 className="display">{hero.display_line1}<br/>{hero.display_line2}</h1>
          <p className="lead">{hero.lead}</p>
          <div className="stat-row">
            <div className="stat"><span className="big mono">{hero.stat_1_value}</span><span className="mini">{hero.stat_1_label}</span></div>
            <div className="stat"><span className="big mono">{hero.stat_2_value}</span><span className="mini">{hero.stat_2_label}</span></div>
            <div className="stat"><span className="big mono">{hero.stat_3_value}</span><span className="mini">{hero.stat_3_label}</span></div>
            <div className="stat"><span className="big mono accent">{hero.stat_4_value}</span><span className="mini">{hero.stat_4_label}</span></div>
          </div>
        </div>

        <section className="block">
          <h2 className="block-title">La dinámica: así se corre tu terreno</h2>
          <div className="timeline">
            {pasos.map((s, i) => (
              <div key={i} className="tl-step">
                <div className="tl-marker"><span className="tl-num mono">{i + 1}</span></div>
                <div className="tl-body">
                  <span className="tl-mes mono accent">{s.mes}</span>
                  <span className="tl-title">{s.titulo}</span>
                  <span className="tl-note muted small">{s.note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="block">
          <h2 className="block-title">El seguimiento: qué pasa según tus números</h2>
          <div className="gar-grid">
            {segui.map((g) => (
              <article key={g.titulo} className="gar-card" style={g.accent ? { ["--accent"]: g.accent } : undefined}>
                <span className="gar-num mono" style={g.accent ? { color: g.accent } : undefined}>{g.numero}</span>
                <h3>{g.titulo}</h3>
                <p>{g.cuerpo}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="block">
          <h2 className="block-title">¿En qué es distinto de otros análisis?</h2>
          <div className="gar-grid">
            {difs.map((g) => (
              <article key={g.numero} className="gar-card">
                <span className="gar-num mono">{g.numero}</span>
                <h3>{g.titulo}</h3>
                <p>{g.cuerpo}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="gar-grid">
          <article className="gar-card">
            <span className="gar-num mono">→</span>
            <h3>{buscamos.titulo}</h3>
            <p>{buscamos.cuerpo}</p>
          </article>
          <article className="gar-card">
            <span className="gar-num mono">$</span>
            <h3>{costo.titulo}</h3>
            <p>{costo.cuerpo}</p>
          </article>
        </div>

        <section className="block" style={{ textAlign: "center", paddingTop: "28px", paddingBottom: "12px" }}>
          <h2 className="display" style={{ fontSize: "clamp(26px, 4vw, 40px)", marginBottom: "10px" }}>{cta.titulo}</h2>
          <p className="lead" style={{ maxWidth: "560px", margin: "0 auto 22px" }}>{cta.sub}</p>
          <a className="foot-cta" href={cta.url} target="_blank" rel="noopener noreferrer"
             style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "16px", padding: "14px 28px" }}>
            {cta.boton} <IconArrow size={16} sw={2} />
          </a>
        </section>
      </div>
    </Shell>
  );
};

// =============================================================================
// 14. QUIÉNES SOMOS — lo que hace Yodesarrollo
// Sheet-driven (tab `quienes` del Sheet) con el mismo respaldo en código.
// =============================================================================
const QUIENES_FALLBACK = {
  hero: {
    kicker: "Yodesarrollo · SAPI de CV",
    display_line1: "No vendemos casas.",
    display_line2: "Desarrollamos patrimonio contigo.",
    lead: "Yodesarrollo nace en Sonora, del lado de la mesa donde se dibujan y se construyen los proyectos: el despacho Aurum Arquitectos. Ahí vimos el mismo problema una y otra vez — dinero dormido en el banco por miedo, y terrenos dormidos bajo el sol por falta de un plan. El co-desarrollo junta a los dos.",
  },
  cards: [
    { numero: "01", titulo: "Socios, no clientes", cuerpo: "En cada proyecto conviven tres aportes: el que pone la tierra, el que pone el capital y el que pone la ejecución. Todos entran a la misma corrida, con reglas escritas y porcentajes claros desde el día uno. Si el proyecto gana, ganan los tres." },
    { numero: "02", titulo: "Todo con escritura", cuerpo: "La garantía de un codesarrollador no es una promesa: es propiedad real, escriturada. Preferimos crecer más lento sobre papel firme que rápido sobre confianza ciega." },
    { numero: "03", titulo: "Todo se mide y se ve", cuerpo: "Cada proyecto vive en un tablero como este: aportaciones, avance de obra, fechas y números en la misma pantalla que ve el equipo. La transparencia no es un valor en la pared — es una herramienta que abres desde tu teléfono." },
  ],
  pasos: [
    { mes: "Hoy", titulo: "Diagnóstico honesto", note: "Nos sentamos a entender qué quieres construir — patrimonio, retiro, flujo — antes de hablar de en qué invertir." },
    { mes: "Semana 1–2", titulo: "Propuesta con números", note: "Recibes escenarios corridos con normas y mercado reales: cuánto entra, cuándo, y qué respalda cada peso." },
    { mes: "Durante", titulo: "Avance a la vista", note: "Sigues tu proyecto en el tablero: fotos de obra, aportaciones, hitos. Sin llamar a preguntar cómo va." },
    { mes: "Al cierre", titulo: "Escritura y retorno", note: "El ciclo termina donde empezó la promesa: con propiedad a tu nombre o capital más ganancia de vuelta." },
  ],
};

const SecQuienesSomos = (props) => {
  const { data } = window.useData();
  const d = (data && data.quienes) || {};
  const hero  = { ...QUIENES_FALLBACK.hero, ...(d.hero || {}) };
  const cards = (d.cards && d.cards.length ? d.cards : QUIENES_FALLBACK.cards).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const pasos = (d.pasos && d.pasos.length ? d.pasos : QUIENES_FALLBACK.pasos).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <Shell {...props} related={["garantias", "casa-alysa", "real-miramar"]}>
      <div className="gar">
        <div className="sec-title-row">
          <span className="kicker">{hero.kicker}</span>
          <h1 className="display">{hero.display_line1}<br/>{hero.display_line2}</h1>
          <p className="lead">{hero.lead}</p>
        </div>

        <div className="gar-grid">
          {cards.map((g) => (
            <article key={g.numero} className="gar-card">
              <span className="gar-num mono">{g.numero}</span>
              <h3>{g.titulo}</h3>
              <p>{g.cuerpo}</p>
            </article>
          ))}
        </div>

        <section className="block">
          <h2 className="block-title">Cómo se ve trabajar con nosotros</h2>
          <div className="timeline">
            {pasos.map((s, i) => (
              <div key={i} className="tl-step">
                <div className="tl-marker"><span className="tl-num mono">{i + 1}</span></div>
                <div className="tl-body">
                  <span className="tl-mes mono accent">{s.mes}</span>
                  <span className="tl-title">{s.titulo}</span>
                  <span className="tl-note muted small">{s.note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
};

// =============================================================================
// 15. ARQUITECTURA DE AUTOR — el sello Aurum en cada desarrollo
// Sheet-driven (tab `autor` del Sheet) con el mismo respaldo en código.
// =============================================================================
const AUTOR_FALLBACK = {
  hero: {
    kicker: "El sello Aurum",
    display_line1: "No construimos de catálogo.",
    display_line2: "Cada proyecto tiene autor.",
    lead: "Detrás de cada desarrollo de Yodesarrollo está Aurum Arquitectos: el despacho donde nació todo esto. Arquitectura de autor significa que ningún proyecto se copia de un machote — se diseña para su terreno, su clima y la vida que va a suceder adentro. Y eso no es un lujo estético: es la razón por la que un desarrollo se vende mejor, se renta mejor y envejece mejor que el de junto.",
  },
  cards: [
    { numero: "01", titulo: "El diseño es plusvalía", cuerpo: "Dos casas con los mismos metros no valen lo mismo. La orientación, la luz, la proporción y el carácter de un proyecto bien diseñado se cobran en cada venta — y el mercado lo paga. Para un codesarrollador, el diseño no es gasto: es margen." },
    { numero: "02", titulo: "Diseñado para este clima", cuerpo: "Proyectamos para Sonora: sombra donde pega el sol, ventilación cruzada, materiales que aguantan. Una casa pensada para el desierto cuesta menos operarla toda su vida — y eso también se nota en el valor de reventa." },
    { numero: "03", titulo: "El mismo lápiz de principio a fin", cuerpo: "Quien diseña el proyecto es quien acompaña la obra. No hay teléfono descompuesto entre el plano y el ladrillo: el criterio del autor llega hasta el último detalle, y el resultado se parece a lo que se prometió." },
  ],
  pasos: [
    { mes: "Escuchar", titulo: "La vida antes que el plano", note: "Cada proyecto empieza con una conversación: cómo se vive, qué se quiere sentir al llegar. En los desarrollos, eso mismo se hace con el perfil del comprador final." },
    { mes: "Proponer", titulo: "Un concepto con carácter", note: "No tres opciones tibias: una propuesta con postura, explicada y defendida. El cliente decide con algo real enfrente." },
    { mes: "Afinar", titulo: "El detalle es el proyecto", note: "Luz, materiales, proporciones. Lo que distingue una obra de autor no se ve en el render — se siente al habitarla." },
    { mes: "Acompañar", titulo: "Hasta la última llave", note: "El despacho sigue en la obra hasta el final, cuidando que lo construido sea lo diseñado." },
  ],
  cuestionario: {
    kicker: "La Experiencia Aurum",
    titulo: "Todo empieza con el Cuestionario de Arquitectura de Autor",
    cuerpo: "Ese 'escuchar' no es una plática suelta: es un cuestionario de perfil de vida que diseñamos para conocerte antes de dibujar. Cómo despiertas, cómo recibes, qué espacios usas de verdad y cuáles solo estorban. De tus respuestas nace el programa de áreas de tu proyecto — cada metro cuadrado justificado por tu forma de vivir, no por un catálogo — y con él, una cotización seria. Lo ideal es llenarlo acompañado, en una videollamada con el despacho: media hora de conversación que le ahorra meses de correcciones al proyecto.",
    boton: "Abrir el cuestionario",
    url: "https://yodesarrollomx.github.io/aurum-experiencia/?utm_source=yodesarrollo-board&utm_medium=presentacion&utm_campaign=board-autor",
    sub: "Sin costo y sin compromiso. Tus respuestas llegan al despacho y te contactamos para agendar la conversación.",
  },
};

const SecAutor = (props) => {
  const { data } = window.useData();
  const d = (data && data.autor) || {};
  const hero  = { ...AUTOR_FALLBACK.hero, ...(d.hero || {}) };
  const cards = (d.cards && d.cards.length ? d.cards : AUTOR_FALLBACK.cards).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const pasos = (d.pasos && d.pasos.length ? d.pasos : AUTOR_FALLBACK.pasos).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const quiz  = { ...AUTOR_FALLBACK.cuestionario, ...(d.cuestionario || {}) };

  return (
    <Shell {...props} related={["quienes-somos", "casa-alysa", "contacto"]}>
      <div className="gar">
        <div className="sec-title-row">
          <span className="kicker">{hero.kicker}</span>
          <h1 className="display">{hero.display_line1}<br/>{hero.display_line2}</h1>
          <p className="lead">{hero.lead}</p>
        </div>

        <div className="gar-grid">
          {cards.map((g) => (
            <article key={g.numero} className="gar-card">
              <span className="gar-num mono">{g.numero}</span>
              <h3>{g.titulo}</h3>
              <p>{g.cuerpo}</p>
            </article>
          ))}
        </div>

        <section className="block">
          <h2 className="block-title">Cómo trabaja el autor</h2>
          <div className="timeline">
            {pasos.map((s, i) => (
              <div key={i} className="tl-step">
                <div className="tl-marker"><span className="tl-num mono">{i + 1}</span></div>
                <div className="tl-body">
                  <span className="tl-mes mono accent">{s.mes}</span>
                  <span className="tl-title">{s.titulo}</span>
                  <span className="tl-note muted small">{s.note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="block" style={{ textAlign: "center", paddingTop: "28px", paddingBottom: "12px" }}>
          <span className="kicker">{quiz.kicker}</span>
          <h2 className="display" style={{ fontSize: "clamp(24px, 3.4vw, 36px)", margin: "10px 0 14px" }}>{quiz.titulo}</h2>
          <p className="lead" style={{ maxWidth: "640px", margin: "0 auto 22px", textAlign: "left" }}>{quiz.cuerpo}</p>
          <a className="foot-cta" href={quiz.url} target="_blank" rel="noopener noreferrer"
             style={{ display: "inline-flex", alignItems: "center", gap: "10px", fontSize: "16px", padding: "14px 28px" }}>
            {quiz.boton} <IconArrow size={16} sw={2} />
          </a>
          <p className="muted small" style={{ marginTop: "12px" }}>{quiz.sub}</p>
        </section>
      </div>
    </Shell>
  );
};

Object.assign(window, {
  SecDiagnostico, SecComparativo, SecCasaAlysa, SecRealMiramar,
  SecCalculadora, SecEstrategia, SecGarantias, SecCronograma,
  SecDecision, SecContacto, SecProyecto, SecAcuerdoPagos,
  SecPPP, SecQuienesSomos, SecAutor,
});
