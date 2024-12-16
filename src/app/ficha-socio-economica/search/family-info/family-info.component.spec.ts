import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FamilyInfoComponent } from './family-info.component';

describe('FamilyInfoComponent', () => {
  let component: FamilyInfoComponent;
  let fixture: ComponentFixture<FamilyInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FamilyInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FamilyInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
