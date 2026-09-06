import { describe, expect, it } from 'vitest'
import { countActiveByParent } from './countActiveByParent'

describe('countActiveByParent', () => {
  it('cuenta rows no archivados agrupados por parentKey', () => {
    const rows = [
      { id: 1, sitioId: 'A', notas: null },
      { id: 2, sitioId: 'A', notas: null },
      { id: 3, sitioId: 'B', notas: null },
    ]

    expect(countActiveByParent(rows, 'sitioId')).toEqual({ A: 2, B: 1 })
  })

  it('excluye rows con notas archivadas', () => {
    const rows = [
      { id: 1, sitioId: 'A', notas: null },
      { id: 2, sitioId: 'A', notas: '[BAJA_LOGICA]' },
    ]

    expect(countActiveByParent(rows, 'sitioId')).toEqual({ A: 1 })
  })

  it('excluye rows cuyo padre no esta en activeParentIds', () => {
    const rows = [
      { id: 1, sitioId: 'A', notas: null },
      { id: 2, sitioId: 'B', notas: null }, // sitio B esta dado de baja
    ]

    expect(countActiveByParent(rows, 'sitioId', new Set(['A']))).toEqual({ A: 1 })
  })

  it('devuelve un objeto vacio para una lista vacia o nula', () => {
    expect(countActiveByParent([], 'sitioId')).toEqual({})
    expect(countActiveByParent(null, 'sitioId')).toEqual({})
  })
})
