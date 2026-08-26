import logo from '../assets/logo.png'

export function AdminLoginPage() {
  return (
    <main className="page page-login">
      <section className="login-card" aria-label="Acceso administrador">
        <img src={logo} alt="STC" className="brand-logo small" />
        <h1>Administrador</h1>
        <p>
          Ruta privada de uso interno. Este acceso no se publica en la pagina
          principal.
        </p>

        <form className="login-form" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="email">Email corporativo</label>
          <input id="email" type="email" placeholder="admin@stc.local" required />

          <label htmlFor="password">Contrasena</label>
          <input id="password" type="password" placeholder="********" required />

          <button type="submit">Ingresar</button>
        </form>
      </section>
    </main>
  )
}
