import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViviendaInfoComponent } from './vivienda-info.component';

describe('ViviendaInfoComponent', () => {
  let component: ViviendaInfoComponent;
  let fixture: ComponentFixture<ViviendaInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViviendaInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViviendaInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
