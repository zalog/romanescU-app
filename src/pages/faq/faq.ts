import { Component } from '@angular/core';
import { FAQItems } from './faq-items';

interface FAQItem {
  title: string;
  description: string;
  icon: string;
  isExpanded: boolean;
};

@Component({
  selector: 'page-faq',
  templateUrl: 'faq.html'
})
export class PageFAQ {
  FAQItems: Array<FAQItem> = [];

  constructor(
  ) {
    this.FAQItems = FAQItems.map(function(item, index) {
      return {
        title: item.title,
        description: item.description,
        icon: 'add-circle',
        isExpanded: false,
      };
    });
  }

  toggleDetails(faq: FAQItem) {
    if (faq.isExpanded) {
      faq.isExpanded = false;
      faq.icon = 'add-circle';
    } else {
      faq.isExpanded = true;
      faq.icon = 'remove-circle';
    }
  }
}
