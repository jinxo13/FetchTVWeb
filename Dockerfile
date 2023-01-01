FROM python:3.7
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8 PYTHONUNBUFFERED=1

WORKDIR /
COPY . /

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "app.py"]
