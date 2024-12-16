import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UbicacionInfoComponent } from './ubicacion-info.component';

describe('UbicacionInfoComponent', () => {
  let component: UbicacionInfoComponent;
  let fixture: ComponentFixture<UbicacionInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UbicacionInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UbicacionInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
