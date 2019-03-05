import { TestBed } from '@angular/core/testing';

import { DragdropService } from './dragdrop.service';

describe('DragdropService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DragdropService = TestBed.get(DragdropService);
    expect(service).toBeTruthy();
  });
});
