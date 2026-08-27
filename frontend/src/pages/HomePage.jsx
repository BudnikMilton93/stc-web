import logo from '../assets/logo.png'

const services = [
  'Instalacion de camaras de seguridad',
  'Porteros electricos',
  'Cerraduras magneticas',
  'Mantenimiento de equipos instalados',
]

const stats = [
  { label: 'Ordenes activas', value: '48' },
  { label: 'Tecnicos en campo', value: '6' },
  { label: 'Sitios atendidos', value: '120+' },
]

export function HomePage() {
  return (
    <main className="page page-home">
      <div className="bg-grid" aria-hidden="true"></div>
      <header className="topbar">
        <img src={logo} alt="STC" className="brand-logo" />
        <div className="brand-copy">
          <p className="eyebrow">Sistema Interno STC</p>
          <h1>Servicio tecnico y seguridad en un solo panel</h1>
        </div>
      </header>

      <section className="hero-card">
        <p>
          Plataforma interna para coordinar clientes, activos, ordenes de trabajo,
          inventario y seguimiento tecnico diario.
        </p>
        <a className="cta" href="mailto:admin@stc.local">
          Solicitar acceso al panel
        </a>
      </section>

      <section className="content-grid">
        <article className="panel">
          <h2>Servicios principales</h2>
          <ul>
            {services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Estado operativo</h2>
          <div className="stats">
            {stats.map((item) => (
              <div key={item.label} className="stat-card">
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}
