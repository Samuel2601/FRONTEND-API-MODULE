import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaludInfoComponent } from './salud-info.component';

describe('SaludInfoComponent', () => {
  let component: SaludInfoComponent;
  let fixture: ComponentFixture<SaludInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaludInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaludInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
