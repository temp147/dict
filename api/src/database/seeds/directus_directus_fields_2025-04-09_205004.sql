--
-- PostgreSQL database dump
--

-- Dumped from database version 16.6 (Debian 16.6-1.pgdg120+1)
-- Dumped by pg_dump version 16.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: directus_fields; Type: TABLE; Schema: public; Owner: directus
--

CREATE TABLE public.directus_fields (
    id integer NOT NULL,
    collection character varying(64) NOT NULL,
    field character varying(64) NOT NULL,
    special character varying(64),
    interface character varying(64),
    options json,
    display character varying(64),
    display_options json,
    readonly boolean DEFAULT false NOT NULL,
    hidden boolean DEFAULT false NOT NULL,
    sort integer,
    width character varying(30) DEFAULT 'full'::character varying,
    translations json,
    note text,
    conditions json,
    required boolean DEFAULT false,
    "group" character varying(64),
    validation json,
    validation_message text
);


ALTER TABLE public.directus_fields OWNER TO directus;

--
-- Name: directus_fields_id_seq; Type: SEQUENCE; Schema: public; Owner: directus
--

CREATE SEQUENCE public.directus_fields_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.directus_fields_id_seq OWNER TO directus;

--
-- Name: directus_fields_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: directus
--

ALTER SEQUENCE public.directus_fields_id_seq OWNED BY public.directus_fields.id;


--
-- Name: directus_fields id; Type: DEFAULT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_fields ALTER COLUMN id SET DEFAULT nextval('public.directus_fields_id_seq'::regclass);


--
-- Data for Name: directus_fields; Type: TABLE DATA; Schema: public; Owner: directus
--

COPY public.directus_fields (id, collection, field, special, interface, options, display, display_options, readonly, hidden, sort, width, translations, note, conditions, required, "group", validation, validation_message) FROM stdin;
1	nb_documents	id	uuid	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
2	nb_documents	name	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
3	nb_documents	doctype	\N	select-dropdown	{"choices":[{"text":"string","value":"string"},{"text":"txt","value":"txt"},{"text":"doc","value":"doc"},{"text":"pdf","value":"pdf"}]}	labels	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
4	nb_documents	users	user-created,user-updated	\N	\N	user	{}	t	f	\N	full	\N	\N	\N	f	\N	\N	\N
5	nb_documents	doc_id	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
6	nb_documents	doc_file	uuid	file	\N	file	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
7	nb_documents	doc_text	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
8	nb_documents	doc_tag	cast-json	select-multiple-checkbox	{"choices":[{"text":"all","value":"all"},{"text":"teenage","value":"teenage"},{"text":"career","value":"career"}]}	labels	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
9	nb_documents	last_updated	date-created,date-updated	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
10	nb_rags	id	uuid	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
11	nb_rags	name	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
12	nb_rags	rag_id	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
13	nb_rags	doc_tag	\N	select-dropdown	{"choices":[{"text":"all","value":"all"},{"text":"teenage","value":"teenage"},{"text":"career","value":"career"}]}	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
14	nb_rags	servers	uuid	select-dropdown-m2o	{"template":"{{name}}"}	related-values	{"template":"{{name}}"}	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
15	nb_servers	id	uuid	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
16	nb_servers	name	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
17	nb_servers	url	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
18	nb_servers	type	\N	select-dropdown	{"choices":[{"text":"flowise","value":"flowise"}]}	labels	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
19	nb_servers	apikey	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
20	nb_servers	apisecret	\N	\N	\N	\N	\N	f	f	\N	full	\N	\N	\N	f	\N	\N	\N
\.


--
-- Name: directus_fields_id_seq; Type: SEQUENCE SET; Schema: public; Owner: directus
--

SELECT pg_catalog.setval('public.directus_fields_id_seq', 20, true);


--
-- Name: directus_fields directus_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: directus
--

ALTER TABLE ONLY public.directus_fields
    ADD CONSTRAINT directus_fields_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

