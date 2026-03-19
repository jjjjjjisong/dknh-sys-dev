import PageHeader from '../components/PageHeader';
import PlaceholderPanel from '../components/PlaceholderPanel';

export default function AccountPage() {
  return (
    <div className="page-content">
      <PageHeader
        title="계정 관리"
        description="이번 단계에서는 실제 계정 기능 없이 페이지 골격만 제공합니다."
      />
      <PlaceholderPanel
        title="계정 관리는 placeholder 상태입니다."
        message="로그인 구조 교체와 계정 관리 기능은 이번 단계에서 구현하지 않습니다."
      />
    </div>
  );
}
