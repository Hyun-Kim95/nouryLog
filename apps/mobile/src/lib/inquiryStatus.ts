export function inquiryStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return '접수';
    case 'in_progress':
      return '처리중';
    case 'done':
      return '완료';
    default:
      return status;
  }
}
