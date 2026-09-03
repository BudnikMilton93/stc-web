import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function renderModal({ open = true, onClose = vi.fn() } = {}) {
  const utils = render(
    <Modal open={open} title="Alta de cliente" onClose={onClose}>
      <form className="crud-form">
        <label>
          Nombre
          <input defaultValue="" />
        </label>
      </form>
    </Modal>,
  )

  return { ...utils, onClose }
}

describe('Modal', () => {
  it('no renderiza nada cuando open es false', () => {
    renderModal({ open: false })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cierra al presionar Escape', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cierra al hacer click en el backdrop', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    // El backdrop es el contenedor con role dialog padre; buscamos el nodo
    // que envuelve el modal-card (el propio backdrop) haciendo click fuera
    // del contenido.
    const dialog = screen.getByRole('dialog')
    await user.click(dialog.parentElement)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('NO cierra al hacer click dentro del contenido del modal', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    await user.click(screen.getByLabelText('Nombre'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('enfoca el primer campo del body al abrir, y NO el boton Cerrar del header', () => {
    renderModal()

    expect(screen.getByLabelText('Nombre')).toHaveFocus()
  })

  it('tipear un espacio en el primer campo no dispara el cierre del modal (regresion de foco)', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()

    const nombreInput = screen.getByLabelText('Nombre')
    // No hacemos click explicito en el input: dependemos del autofocus que
    // dispara el modal al abrir (igual que un usuario real que empieza a
    // tipear apenas se abre el modal). Si el foco inicial cayera en el boton
    // "Cerrar" del header, un espacio dispararia su click nativo y cerraria
    // el modal a mitad de la escritura.
    expect(nombreInput).toHaveFocus()
    await user.keyboard('Juan Perez')

    expect(nombreInput).toHaveValue('Juan Perez')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
