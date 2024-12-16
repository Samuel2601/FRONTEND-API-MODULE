import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedioInfoComponent } from './medio-info.component';

describe('MedioInfoComponent', () => {
  let component: MedioInfoComponent;
  let fixture: ComponentFixture<MedioInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedioInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MedioInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
