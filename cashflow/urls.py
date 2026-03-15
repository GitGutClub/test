"""URL-маршруты веб-интерфейса приложения cashflow."""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('record/new/', views.record_form, name='record_create'),
    path('record/<int:pk>/edit/', views.record_form, name='record_edit'),
    path('references/', views.references, name='references'),
]
