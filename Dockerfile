FROM python:3.11-slim

ENV TZ=UTC

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app
COPY alembic.ini .
COPY alembic alembic
COPY .env .

EXPOSE 8000

COPY entrypoint.sh .
COPY wait-for-it.sh .
RUN apt-get update \
	&& apt-get install -y --no-install-recommends bash \
	&& rm -rf /var/lib/apt/lists/* \
	&& chmod +x entrypoint.sh wait-for-it.sh \
	&& sed -i 's/\r$//' entrypoint.sh wait-for-it.sh
ENTRYPOINT ["./entrypoint.sh"]
