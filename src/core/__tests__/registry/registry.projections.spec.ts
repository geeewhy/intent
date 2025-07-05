import '../../initialize';
import { getAllProjections } from '../../registry';

describe('Registry projections', () => {
  it('registry has projections', () => {
    expect(Object.keys(getAllProjections()).length).toBeGreaterThan(0);
  });
});