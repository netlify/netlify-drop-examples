import { describe, it, expect } from 'vitest'
import { csvAdapter, parseCsv } from '@/datasets/adapters/csv'
import { DatasetValidationError } from '@/datasets/contract'

const oppHeader = 'id,owner,stage,amount,created_date,close_date,segment,source,status'
const goodOpp = 'opp_1,Rep A,Proposal,1000.50,2026-01-05,2026-03-01,SMB,Inbound,open'

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, CRLF and embedded newlines', () => {
    const rows = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n"multi\nline",z\r\n')
    expect(rows.map((r) => r.cells)).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['multi\nline', 'z'],
    ])
    expect(rows.map((r) => r.line)).toEqual([1, 2, 3])
  })
  it('skips blank lines', () => {
    expect(parseCsv('a\n\nb\n').map((r) => r.cells)).toEqual([['a'], ['b']])
  })
})

describe('csvAdapter', () => {
  it('parses valid opportunities', async () => {
    const rows = await csvAdapter.getDataset('opportunities', { text: `${oppHeader}\n${goodOpp}\n` })
    expect(rows[0]).toMatchObject({ id: 'opp_1', amount: 1000.5, status: 'open' })
  })

  it('normalizes ARR month to the first of the month', async () => {
    const rows = await csvAdapter.getDataset('arr_snapshots', {
      text: 'account_id,month,arr\nacct_1,2026-02-17,1200\n',
    })
    expect(rows[0]).toEqual({ account_id: 'acct_1', month: '2026-02-01', arr: 1200 })
  })

  it('reports the first failing row and column with file-line numbering', async () => {
    const text = `${oppHeader}\n${goodOpp}\nopp_2,Rep A,Proposal,5,2026-01-05,3/4/24,SMB,Inbound,open\n`
    await expect(csvAdapter.getDataset('opportunities', { text })).rejects.toMatchObject({
      row: 3,
      column: 'close_date',
    })
    await expect(csvAdapter.getDataset('opportunities', { text })).rejects.toThrow(/got '3\/4\/24'/)
  })

  it('rejects extra and missing columns', async () => {
    await expect(
      csvAdapter.getDataset('opportunities', { text: `${oppHeader},account_name\n` }),
    ).rejects.toMatchObject({ column: 'account_name', message: expect.stringContaining('unexpected') })
    await expect(
      csvAdapter.getDataset('arr_snapshots', { text: 'account_id,month\n' }),
    ).rejects.toMatchObject({ column: 'arr' })
  })

  it('rejects name-like account IDs', async () => {
    await expect(
      csvAdapter.getDataset('arr_snapshots', { text: 'account_id,month,arr\nAcme Corp,2026-01-01,5\n' }),
    ).rejects.toMatchObject({ row: 2, column: 'account_id' })
  })

  it('rejects stages outside the configured list', async () => {
    const text = `${oppHeader}\nopp_1,Rep A,Daydream,1,2026-01-05,2026-03-01,SMB,Inbound,open\n`
    await expect(csvAdapter.getDataset('opportunities', { text })).rejects.toMatchObject({ column: 'stage' })
  })

  it('rejects negative amounts, bad status and impossible dates', async () => {
    for (const [bad, col] of [
      ['opp_1,A,Proposal,-5,2026-01-05,2026-03-01,SMB,Inbound,open', 'amount'],
      ['opp_1,A,Proposal,5,2026-01-05,2026-03-01,SMB,Inbound,pending', 'status'],
      ['opp_1,A,Proposal,5,2026-02-30,2026-03-01,SMB,Inbound,open', 'created_date'],
    ]) {
      await expect(
        csvAdapter.getDataset('opportunities', { text: `${oppHeader}\n${bad}\n` }),
      ).rejects.toMatchObject({
        column: col,
      })
    }
  })

  it('rejects ragged rows and throws DatasetValidationError', async () => {
    const err = await csvAdapter
      .getDataset('opportunities', { text: `${oppHeader}\nopp_1,A\n` })
      .catch((e) => e)
    expect(err).toBeInstanceOf(DatasetValidationError)
    expect(err.row).toBe(2)
  })
})
