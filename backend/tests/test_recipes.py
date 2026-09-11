from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_create_list_get_and_update_recipe() -> None:
    create_response = client.post(
        "/api/recipes/",
        json={
            "title": "Pancakes",
            "description": "Fluffy breakfast pancakes",
            "servings": 4,
            "ingredients": [
                {"name": "flour", "amount": 200, "unit": "g"},
                {"name": "milk", "amount": 300, "unit": "ml"},
                {"name": "eggs", "amount": 1, "unit": None},
            ],
            "steps": ["Mix ingredients", "Fry in a pan"],
            "tags": ["breakfast"],
        },
    )
    assert create_response.status_code == 201
    recipe = create_response.json()
    assert recipe["notes"] is None
    assert recipe["ingredients"][0]["name"] == "flour"

    list_response = client.get("/api/recipes/")
    assert list_response.status_code == 200
    assert any(r["id"] == recipe["id"] for r in list_response.json())

    get_response = client.get(f"/api/recipes/{recipe['id']}")
    assert get_response.status_code == 200
    assert get_response.json()["title"] == "Pancakes"

    update_response = client.patch(
        f"/api/recipes/{recipe['id']}", json={"notes": "Add more sugar next time"}
    )
    assert update_response.status_code == 200
    assert update_response.json()["notes"] == "Add more sugar next time"


def test_get_missing_recipe_returns_404() -> None:
    response = client.get("/api/recipes/999999")
    assert response.status_code == 404
