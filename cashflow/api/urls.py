"""URL-маршруты REST API."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from .views_dashboard import dashboard_summary

router = DefaultRouter()
router.register(r'statuses', views.StatusViewSet, basename='status')
router.register(r'types', views.TypeViewSet, basename='type')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'subcategories', views.SubcategoryViewSet, basename='subcategory')
router.register(r'records', views.CashFlowRecordViewSet, basename='record')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/summary/', dashboard_summary),
]
