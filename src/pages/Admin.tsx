import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
    BarChart3,
    Check,
    ChevronRight,
    ClipboardList,
    FileText,
    HandHeart,
    ImagePlus,
    Images,
    LogOut,
    Megaphone,
    Menu,
    MousePointerClick,
    PawPrint,
    Pencil,
    Plug,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, isDemoMode } from '../lib/api';
import { publicAsset } from '../lib/assets';
import type { AdoptionApplication, Campaign, Pet, VolunteerApplication } from '../lib/types';
import CmsPanel from '../components/admin/CmsPanel';
import type { CmsSection } from '../components/admin/CmsPanel';

type Tab = 'overview' | 'pets' | 'adoptions' | 'volunteers' | 'campaigns' | CmsSection;
type PetDraft = Partial<Pet> &
    Pick<
        Pet,
        | 'name'
        | 'species'
        | 'sex'
        | 'ageGroup'
        | 'ageLabel'
        | 'size'
        | 'city'
        | 'image'
        | 'description'
        | 'temperament'
        | 'vaccinated'
        | 'neutered'
        | 'status'
    >;
type CampaignDraft = Partial<Campaign> &
    Pick<Campaign, 'title' | 'description' | 'image' | 'target' | 'raised' | 'status' | 'category'>;
const blankPet: PetDraft = {
    name: '',
    species: 'cat',
    sex: 'female',
    ageGroup: 'adult',
    ageLabel: '',
    size: 'small',
    city: 'Araraquara',
    image: '',
    description: '',
    temperament: [],
    vaccinated: false,
    neutered: false,
    status: 'available',
};
const blankCampaign: CampaignDraft = {
    title: '',
    description: '',
    image: '',
    target: 0,
    raised: 0,
    status: 'active',
    category: 'Cuidados veterinários',
};
const petStatus = {
    available: 'Disponível',
    treatment: 'Em tratamento',
    adopted: 'Adotado',
};
const adoptionStatus = {
    pending: 'Pendente',
    contacted: 'Em contato',
    approved: 'Aprovada',
    rejected: 'Não aprovada',
};
const volunteerStatus = {
    pending: 'Pendente',
    contacted: 'Em contato',
    active: 'Ativo',
};
const volunteerInterestLabels: Record<string, string> = {
    'temporary-home': 'Lar temporário',
    transport: 'Carona solidária',
    events: 'Feiras e eventos',
    online: 'Apoio à distância',
};
const volunteerInterestLabel = (interest: string) =>
    volunteerInterestLabels[interest] ??
    interest
        .replace(/[-_]+/g, ' ')
        .replace(/^./, (firstLetter) => firstLetter.toLocaleUpperCase('pt-BR'));

export default function Admin() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('overview');
    const [menu, setMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pets, setPets] = useState<Pet[]>([]);
    const [adoptions, setAdoptions] = useState<AdoptionApplication[]>([]);
    const [volunteers, setVolunteers] = useState<VolunteerApplication[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [petDraft, setPetDraft] = useState<PetDraft | null>(null);
    const [campaignDraft, setCampaignDraft] = useState<CampaignDraft | null>(null);
    const [saving, setSaving] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [cmsDirty, setCmsDirty] = useState(false);
    const modalRef = useRef<HTMLFormElement>(null);
    const mounted = useRef(true);
    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const session = await api.getSession();
            if (!mounted.current) return;
            if (!session.authenticated) {
                navigate('/admin/entrar', { replace: true });
                return;
            }
            const [p, a, v, c] = await Promise.all([
                api.getAdminPets(),
                api.getAdoptions(),
                api.getVolunteers(),
                api.getCampaigns(),
            ]);
            if (!mounted.current) return;
            setPets(p);
            setAdoptions(a);
            setVolunteers(v);
            setCampaigns(c);
        } catch (cause) {
            if (mounted.current)
                setError(
                    cause instanceof Error
                        ? cause.message
                        : 'Não foi possível carregar os dados do painel.',
                );
        } finally {
            if (mounted.current) setLoading(false);
        }
    };
    useEffect(() => {
        mounted.current = true;
        void load();
        return () => {
            mounted.current = false;
        };
    }, []);
    useEffect(() => {
        if (!petDraft && !campaignDraft) return;
        const previous = document.activeElement as HTMLElement | null;
        const oldOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        modalRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPetDraft(null);
                setCampaignDraft(null);
                return;
            }
            if (event.key === 'Tab' && modalRef.current) {
                const focusable = Array.from(
                    modalRef.current.querySelectorAll<HTMLElement>(
                        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
                    ),
                );
                if (!focusable.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (
                    event.shiftKey &&
                    (document.activeElement === first ||
                        document.activeElement === modalRef.current)
                ) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = oldOverflow;
            document.removeEventListener('keydown', onKey);
            previous?.focus();
        };
    }, [Boolean(petDraft || campaignDraft)]);
    const go = (next: Tab) => {
        if (
            cmsDirty &&
            !window.confirm('Há alterações não salvas. Deseja sair desta área e perdê-las?')
        ) {
            return;
        }
        setTab(next);
        setMenu(false);
    };
    const signOut = async () => {
        if (
            cmsDirty &&
            !window.confirm('Há alterações não salvas. Deseja sair do painel e perdê-las?')
        ) {
            return;
        }
        setError('');
        try {
            await api.logout();
            navigate('/admin/entrar', { replace: true });
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Não foi possível sair do painel.');
        }
    };
    const savePet = async (e: FormEvent) => {
        e.preventDefault();
        if (!petDraft) return;
        setSaving(true);
        setError('');
        try {
            await api.savePet(petDraft);
            setPetDraft(null);
            setPets(await api.getAdminPets());
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o animal.');
        } finally {
            setSaving(false);
        }
    };
    const removePet = async (id: string) => {
        setSaving(true);
        try {
            await api.deletePet(id);
            setPets(await api.getAdminPets());
            setDeleteId(null);
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Não foi possível excluir o cadastro.',
            );
        } finally {
            setSaving(false);
        }
    };
    const saveCampaign = async (e: FormEvent) => {
        e.preventDefault();
        if (!campaignDraft) return;
        setSaving(true);
        setError('');
        try {
            await api.saveCampaign(campaignDraft);
            setCampaignDraft(null);
            setCampaigns(await api.getCampaigns());
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Não foi possível salvar a campanha.',
            );
        } finally {
            setSaving(false);
        }
    };
    const upload = async (file?: File) => {
        if (!file || !petDraft) return;
        setSaving(true);
        try {
            const image = await api.uploadImage(file);
            setPetDraft({ ...petDraft, image });
        } catch {
            setError('Não foi possível enviar a imagem.');
        } finally {
            setSaving(false);
        }
    };
    const updateAdoption = async (id: string, status: AdoptionApplication['status']) => {
        setUpdatingId(id);
        try {
            await api.updateAdoption(id, status);
            setAdoptions(await api.getAdoptions());
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Não foi possível atualizar a triagem.',
            );
        } finally {
            setUpdatingId(null);
        }
    };
    const updateVolunteer = async (id: string, status: VolunteerApplication['status']) => {
        setUpdatingId(id);
        try {
            await api.updateVolunteer(id, status);
            setVolunteers(await api.getVolunteers());
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Não foi possível atualizar o voluntário.',
            );
        } finally {
            setUpdatingId(null);
        }
    };
    const nav = [
        ['overview', 'Visão geral', BarChart3],
        ['pets', 'Animais', PawPrint],
        ['adoptions', 'Triagens', ClipboardList],
        ['volunteers', 'Voluntários', HandHeart],
        ['campaigns', 'Campanhas', Megaphone],
        ['content', 'Conteúdo do site', FileText],
        ['articles', 'Artigos', ClipboardList],
        ['media', 'Mídias', Images],
        ['navigation', 'Menus e botões', MousePointerClick],
        ['integrations', 'Integrações', Plug],
    ] as const;
    const filteredPets = pets.filter(
        (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.city.toLowerCase().includes(search.toLowerCase()),
    );
    return (
        <div className="admin-page">
            <aside className={`admin-sidebar ${menu ? 'open' : ''}`}>
                <div className="admin-brand">
                    <PawPrint />
                    <strong>AdoCat</strong>
                    <span>gestão</span>
                </div>
                <nav>
                    {nav.map(([id, label, Icon]) => (
                        <button
                            key={id}
                            className={tab === id ? 'active' : ''}
                            onClick={() => go(id)}
                        >
                            <Icon />
                            <span>{label}</span>
                            {tab === id && <ChevronRight />}
                        </button>
                    ))}
                </nav>
                <div className="admin-side-bottom">
                    {isDemoMode && <span className="demo-badge">Modo demonstração</span>}
                    <button onClick={signOut}>
                        <LogOut /> Sair
                    </button>
                </div>
            </aside>
            <div className="admin-main">
                <header className="admin-topbar">
                    <button
                        className="admin-menu"
                        onClick={() => setMenu(!menu)}
                        aria-label="Abrir menu"
                    >
                        <Menu />
                    </button>
                    <div>
                        <span className="eyebrow">Painel administrativo</span>
                        <strong>Olá, equipe AdoCat</strong>
                    </div>
                    <div className="admin-avatar">AC</div>
                </header>
                <div className="admin-content">
                    {error && (
                        <div className="admin-alert">
                            {error}
                            <button onClick={() => setError('')}>
                                <X />
                            </button>
                        </div>
                    )}
                    {loading ? (
                        <div className="admin-loading">Carregando painel…</div>
                    ) : (
                        <>
                            {tab === 'overview' && (
                                <section>
                                    <PageTitle
                                        title="Visão geral"
                                        text="Acompanhe o trabalho da rede hoje."
                                    />
                                    <div className="stat-grid">
                                        <Stat
                                            icon={PawPrint}
                                            value={
                                                pets.filter((p) => p.status === 'available').length
                                            }
                                            label="animais disponíveis"
                                        />
                                        <Stat
                                            icon={ClipboardList}
                                            value={
                                                adoptions.filter((a) => a.status === 'pending')
                                                    .length
                                            }
                                            label="triagens pendentes"
                                        />
                                        <Stat
                                            icon={HandHeart}
                                            value={
                                                volunteers.filter((v) => v.status === 'pending')
                                                    .length
                                            }
                                            label="novos voluntários"
                                        />
                                        <Stat
                                            icon={Megaphone}
                                            value={
                                                campaigns.filter((c) => c.status === 'active')
                                                    .length
                                            }
                                            label="campanhas ativas"
                                        />
                                    </div>
                                    <div className="admin-card recent-card">
                                        <div className="card-title">
                                            <div>
                                                <h2>Triagens recentes</h2>
                                                <p>Novos interessados aguardando contato.</p>
                                            </div>
                                            <button
                                                className="text-button"
                                                onClick={() => setTab('adoptions')}
                                            >
                                                Ver todas <ChevronRight />
                                            </button>
                                        </div>
                                        <ApplicationTable
                                            items={adoptions.slice(0, 5)}
                                            pets={pets}
                                            update={updateAdoption}
                                            updatingId={updatingId}
                                        />
                                    </div>
                                </section>
                            )}
                            {tab === 'pets' && (
                                <section>
                                    <PageTitle
                                        title="Animais"
                                        text="Cadastros, saúde e situação de cada acolhido."
                                        action={
                                            <button
                                                className="button button-primary"
                                                onClick={() => setPetDraft({ ...blankPet })}
                                            >
                                                <Plus /> Novo animal
                                            </button>
                                        }
                                    />
                                    <div className="admin-tools">
                                        <label className="search-box">
                                            <Search />
                                            <input
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Buscar por nome ou cidade"
                                            />
                                        </label>
                                        <span>{filteredPets.length} cadastros</span>
                                    </div>
                                    {filteredPets.length ? (
                                        <div className="pet-admin-grid">
                                            {filteredPets.map((p) => (
                                                <article className="admin-pet-card" key={p.id}>
                                                    <img src={publicAsset(p.image)} alt="" />
                                                    <div>
                                                        <div className="card-title">
                                                            <span
                                                                className={`status status-${p.status}`}
                                                            >
                                                                {petStatus[p.status]}
                                                            </span>
                                                            <div className="icon-actions">
                                                                <button
                                                                    aria-label="Editar"
                                                                    onClick={() =>
                                                                        setPetDraft({ ...p })
                                                                    }
                                                                >
                                                                    <Pencil />
                                                                </button>
                                                                <button
                                                                    aria-label="Excluir"
                                                                    onClick={() =>
                                                                        setDeleteId(p.id)
                                                                    }
                                                                >
                                                                    <Trash2 />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <h3>{p.name}</h3>
                                                        <p>
                                                            {p.ageLabel} · {p.city}
                                                        </p>
                                                        <div className="health-row">
                                                            <span
                                                                className={
                                                                    p.vaccinated ? 'done' : ''
                                                                }
                                                            >
                                                                <Check /> Vacinado
                                                            </span>
                                                            <span
                                                                className={p.neutered ? 'done' : ''}
                                                            >
                                                                <Check /> Castrado
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {deleteId === p.id && (
                                                        <div className="delete-confirm">
                                                            <p>Excluir o cadastro de {p.name}?</p>
                                                            <div>
                                                                <button
                                                                    className="button button-secondary"
                                                                    onClick={() =>
                                                                        setDeleteId(null)
                                                                    }
                                                                >
                                                                    Cancelar
                                                                </button>
                                                                <button
                                                                    className="button danger"
                                                                    disabled={saving}
                                                                    onClick={() => removePet(p.id)}
                                                                >
                                                                    Excluir
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </article>
                                            ))}
                                        </div>
                                    ) : (
                                        <Empty text="Nenhum animal encontrado." />
                                    )}
                                </section>
                            )}
                            {tab === 'adoptions' && (
                                <section>
                                    <PageTitle
                                        title="Triagens de adoção"
                                        text="Avalie os interessados e organize os próximos contatos."
                                    />
                                    {adoptions.length ? (
                                        <div className="admin-card">
                                            <ApplicationTable
                                                items={adoptions}
                                                pets={pets}
                                                update={updateAdoption}
                                                updatingId={updatingId}
                                            />
                                        </div>
                                    ) : (
                                        <Empty text="Nenhuma inscrição de adoção recebida." />
                                    )}
                                </section>
                            )}
                            {tab === 'volunteers' && (
                                <section>
                                    <PageTitle
                                        title="Voluntários"
                                        text="Pessoas disponíveis para fortalecer a rede."
                                    />
                                    {volunteers.length ? (
                                        <div className="admin-card table-scroll">
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th>Pessoa</th>
                                                        <th>Interesses</th>
                                                        <th>Disponibilidade</th>
                                                        <th>Recebido em</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {volunteers.map((v) => (
                                                        <tr key={v.id}>
                                                            <td>
                                                                <strong>{v.name}</strong>
                                                                <small>
                                                                    {v.email}
                                                                    <br />
                                                                    {v.phone} · {v.city}
                                                                </small>
                                                            </td>
                                                            <td>
                                                                <div className="tag-list">
                                                                    {v.interests.map((i) => (
                                                                        <span key={i}>
                                                                            {volunteerInterestLabel(
                                                                                i,
                                                                            )}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td>{v.availability}</td>
                                                            <td>
                                                                {new Date(
                                                                    v.createdAt,
                                                                ).toLocaleDateString('pt-BR')}
                                                            </td>
                                                            <td>
                                                                <select
                                                                    aria-label={`Status de ${v.name}`}
                                                                    className="table-select"
                                                                    disabled={updatingId === v.id}
                                                                    value={v.status}
                                                                    onChange={(e) =>
                                                                        updateVolunteer(
                                                                            v.id,
                                                                            e.target
                                                                                .value as VolunteerApplication['status'],
                                                                        )
                                                                    }
                                                                >
                                                                    {Object.entries(
                                                                        volunteerStatus,
                                                                    ).map(([k, l]) => (
                                                                        <option key={k} value={k}>
                                                                            {l}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <Empty text="Nenhum cadastro de voluntário recebido." />
                                    )}
                                </section>
                            )}
                            {tab === 'campaigns' && (
                                <section>
                                    <PageTitle
                                        title="Campanhas"
                                        text="Metas e arrecadações para os cuidados da ONG."
                                        action={
                                            <button
                                                className="button button-primary"
                                                onClick={() =>
                                                    setCampaignDraft({ ...blankCampaign })
                                                }
                                            >
                                                <Plus /> Nova campanha
                                            </button>
                                        }
                                    />
                                    {campaigns.length ? (
                                        <div className="campaign-admin-grid">
                                            {campaigns.map((c) => {
                                                const percent = Math.min(
                                                    100,
                                                    c.target ? (c.raised / c.target) * 100 : 0,
                                                );
                                                return (
                                                    <article
                                                        className="admin-card campaign-admin"
                                                        key={c.id}
                                                    >
                                                        <img src={publicAsset(c.image)} alt="" />
                                                        <div>
                                                            <span
                                                                className={`status status-${c.status}`}
                                                            >
                                                                {c.status === 'active'
                                                                    ? 'Ativa'
                                                                    : 'Concluída'}
                                                            </span>
                                                            <h3>{c.title}</h3>
                                                            <p>{c.description}</p>
                                                            <div className="progress">
                                                                <i
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>
                                                            <div className="campaign-values">
                                                                <strong>
                                                                    {c.raised.toLocaleString(
                                                                        'pt-BR',
                                                                        {
                                                                            style: 'currency',
                                                                            currency: 'BRL',
                                                                        },
                                                                    )}
                                                                </strong>
                                                                <span>
                                                                    de{' '}
                                                                    {c.target.toLocaleString(
                                                                        'pt-BR',
                                                                        {
                                                                            style: 'currency',
                                                                            currency: 'BRL',
                                                                        },
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <button
                                                                className="button button-secondary"
                                                                onClick={() =>
                                                                    setCampaignDraft({ ...c })
                                                                }
                                                            >
                                                                <Pencil /> Editar
                                                            </button>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <Empty text="Nenhuma campanha cadastrada." />
                                    )}
                                </section>
                            )}
                            {(
                                [
                                    'content',
                                    'articles',
                                    'media',
                                    'navigation',
                                    'integrations',
                                ] as CmsSection[]
                            ).includes(tab as CmsSection) && (
                                <CmsPanel
                                    key={tab}
                                    section={tab as CmsSection}
                                    onDirtyChange={setCmsDirty}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
            {petDraft && (
                <div
                    className="admin-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="pet-modal-title"
                >
                    <form className="modal-card" onSubmit={savePet} ref={modalRef} tabIndex={-1}>
                        <ModalHead
                            titleId="pet-modal-title"
                            title={petDraft.id ? 'Editar animal' : 'Novo animal'}
                            close={() => setPetDraft(null)}
                        />
                        <div className="modal-body">
                            {error && (
                                <p className="form-error" role="alert">
                                    {error}
                                </p>
                            )}
                            <div className="form-grid">
                                <label className="field field-wide" htmlFor="pet-name">
                                    <span>Nome</span>
                                    <input
                                        id="pet-name"
                                        required
                                        value={petDraft.name}
                                        onChange={(e) =>
                                            setPetDraft({ ...petDraft, name: e.target.value })
                                        }
                                    />
                                </label>
                                <Select
                                    label="Espécie"
                                    value={petDraft.species}
                                    change={(species) =>
                                        setPetDraft({
                                            ...petDraft,
                                            species: species as Pet['species'],
                                        })
                                    }
                                    options={[
                                        ['cat', 'Gato'],
                                        ['dog', 'Cachorro'],
                                    ]}
                                />
                                <Select
                                    label="Sexo"
                                    value={petDraft.sex}
                                    change={(sex) =>
                                        setPetDraft({ ...petDraft, sex: sex as Pet['sex'] })
                                    }
                                    options={[
                                        ['female', 'Fêmea'],
                                        ['male', 'Macho'],
                                    ]}
                                />
                                <Select
                                    label="Faixa etária"
                                    value={petDraft.ageGroup}
                                    change={(ageGroup) =>
                                        setPetDraft({
                                            ...petDraft,
                                            ageGroup: ageGroup as Pet['ageGroup'],
                                        })
                                    }
                                    options={[
                                        ['kitten', 'Filhote'],
                                        ['adult', 'Adulto'],
                                        ['senior', 'Idoso'],
                                    ]}
                                />
                                <label className="field" htmlFor="pet-age-label">
                                    <span>Idade exibida</span>
                                    <input
                                        id="pet-age-label"
                                        required
                                        value={petDraft.ageLabel}
                                        onChange={(e) =>
                                            setPetDraft({ ...petDraft, ageLabel: e.target.value })
                                        }
                                        placeholder="Ex.: 2 anos"
                                    />
                                </label>
                                <Select
                                    label="Porte"
                                    value={petDraft.size}
                                    change={(size) =>
                                        setPetDraft({ ...petDraft, size: size as Pet['size'] })
                                    }
                                    options={[
                                        ['small', 'Pequeno'],
                                        ['medium', 'Médio'],
                                        ['large', 'Grande'],
                                    ]}
                                />
                                <label className="field" htmlFor="pet-city">
                                    <span>Cidade</span>
                                    <input
                                        id="pet-city"
                                        required
                                        value={petDraft.city}
                                        onChange={(e) =>
                                            setPetDraft({ ...petDraft, city: e.target.value })
                                        }
                                    />
                                </label>
                                <Select
                                    label="Status"
                                    value={petDraft.status}
                                    change={(status) =>
                                        setPetDraft({
                                            ...petDraft,
                                            status: status as Pet['status'],
                                        })
                                    }
                                    options={Object.entries(petStatus)}
                                />
                                <label className="field field-wide" htmlFor="pet-temperament">
                                    <span>Temperamento (separe por vírgula)</span>
                                    <input
                                        id="pet-temperament"
                                        value={petDraft.temperament.join(', ')}
                                        onChange={(e) =>
                                            setPetDraft({
                                                ...petDraft,
                                                temperament: e.target.value
                                                    .split(',')
                                                    .map((x) => x.trim())
                                                    .filter(Boolean),
                                            })
                                        }
                                    />
                                </label>
                                <label className="field field-wide" htmlFor="pet-description">
                                    <span>Descrição</span>
                                    <textarea
                                        id="pet-description"
                                        required
                                        rows={4}
                                        value={petDraft.description}
                                        onChange={(e) =>
                                            setPetDraft({
                                                ...petDraft,
                                                description: e.target.value,
                                            })
                                        }
                                    />
                                </label>
                                <label className="upload-field field-wide" htmlFor="pet-file">
                                    <ImagePlus />
                                    <span>{petDraft.image ? 'Trocar foto' : 'Enviar foto'}</span>
                                    <input
                                        id="pet-file"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => upload(e.target.files?.[0])}
                                    />
                                </label>
                                <label className="field field-wide" htmlFor="pet-image">
                                    <span>URL da imagem</span>
                                    <input
                                        id="pet-image"
                                        required
                                        value={petDraft.image}
                                        onChange={(e) =>
                                            setPetDraft({ ...petDraft, image: e.target.value })
                                        }
                                    />
                                </label>
                                <label className="check-field" htmlFor="pet-vaccinated">
                                    <input
                                        id="pet-vaccinated"
                                        type="checkbox"
                                        checked={petDraft.vaccinated}
                                        onChange={(e) =>
                                            setPetDraft({
                                                ...petDraft,
                                                vaccinated: e.target.checked,
                                            })
                                        }
                                    />
                                    <span>Vacinado</span>
                                </label>
                                {petDraft.vaccinated && (
                                    <label className="field" htmlFor="pet-vaccine-date">
                                        <span>Data da vacinação</span>
                                        <input
                                            id="pet-vaccine-date"
                                            type="date"
                                            value={petDraft.vaccineDate || ''}
                                            onChange={(e) =>
                                                setPetDraft({
                                                    ...petDraft,
                                                    vaccineDate: e.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                )}
                                <label className="check-field" htmlFor="pet-neutered">
                                    <input
                                        id="pet-neutered"
                                        type="checkbox"
                                        checked={petDraft.neutered}
                                        onChange={(e) =>
                                            setPetDraft({ ...petDraft, neutered: e.target.checked })
                                        }
                                    />
                                    <span>Castrado</span>
                                </label>
                                {petDraft.neutered && (
                                    <label className="field" htmlFor="pet-neuter-date">
                                        <span>Data da castração</span>
                                        <input
                                            id="pet-neuter-date"
                                            type="date"
                                            value={petDraft.neuterDate || ''}
                                            onChange={(e) =>
                                                setPetDraft({
                                                    ...petDraft,
                                                    neuterDate: e.target.value,
                                                })
                                            }
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                        <ModalActions saving={saving} close={() => setPetDraft(null)} />
                    </form>
                </div>
            )}
            {campaignDraft && (
                <div
                    className="admin-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="campaign-modal-title"
                >
                    <form
                        className="modal-card compact"
                        onSubmit={saveCampaign}
                        ref={modalRef}
                        tabIndex={-1}
                    >
                        <ModalHead
                            titleId="campaign-modal-title"
                            title={campaignDraft.id ? 'Editar campanha' : 'Nova campanha'}
                            close={() => setCampaignDraft(null)}
                        />
                        <div className="modal-body">
                            {error && (
                                <p className="form-error" role="alert">
                                    {error}
                                </p>
                            )}
                            <div className="form-grid">
                                <label className="field field-wide" htmlFor="campaign-title">
                                    <span>Título</span>
                                    <input
                                        id="campaign-title"
                                        required
                                        value={campaignDraft.title}
                                        onChange={(e) =>
                                            setCampaignDraft({
                                                ...campaignDraft,
                                                title: e.target.value,
                                            })
                                        }
                                    />
                                </label>
                                <label className="field field-wide" htmlFor="campaign-description">
                                    <span>Descrição</span>
                                    <textarea
                                        id="campaign-description"
                                        required
                                        rows={4}
                                        value={campaignDraft.description}
                                        onChange={(e) =>
                                            setCampaignDraft({
                                                ...campaignDraft,
                                                description: e.target.value,
                                            })
                                        }
                                    />
                                </label>
                                <label className="field" htmlFor="campaign-target">
                                    <span>Meta (R$)</span>
                                    <input
                                        id="campaign-target"
                                        required
                                        min="0.01"
                                        step="0.01"
                                        type="number"
                                        value={campaignDraft.target}
                                        onChange={(e) =>
                                            setCampaignDraft({
                                                ...campaignDraft,
                                                target: Number(e.target.value),
                                            })
                                        }
                                    />
                                </label>
                                <label className="field" htmlFor="campaign-raised">
                                    <span>Arrecadado (R$)</span>
                                    <input
                                        id="campaign-raised"
                                        required
                                        min="0"
                                        step="0.01"
                                        type="number"
                                        value={campaignDraft.raised}
                                        onChange={(e) =>
                                            setCampaignDraft({
                                                ...campaignDraft,
                                                raised: Number(e.target.value),
                                            })
                                        }
                                    />
                                </label>
                                <label className="field" htmlFor="campaign-category">
                                    <span>Categoria</span>
                                    <input
                                        id="campaign-category"
                                        required
                                        value={campaignDraft.category}
                                        onChange={(e) =>
                                            setCampaignDraft({
                                                ...campaignDraft,
                                                category: e.target.value,
                                            })
                                        }
                                    />
                                </label>
                                <Select
                                    label="Status"
                                    value={campaignDraft.status}
                                    change={(status) =>
                                        setCampaignDraft({
                                            ...campaignDraft,
                                            status: status as Campaign['status'],
                                        })
                                    }
                                    options={[
                                        ['active', 'Ativa'],
                                        ['completed', 'Concluída'],
                                    ]}
                                />
                                <label className="field field-wide" htmlFor="campaign-image">
                                    <span>Imagem (URL)</span>
                                    <input
                                        id="campaign-image"
                                        required
                                        value={campaignDraft.image}
                                        onChange={(e) =>
                                            setCampaignDraft({
                                                ...campaignDraft,
                                                image: e.target.value,
                                            })
                                        }
                                    />
                                </label>
                                <label className="field field-wide" htmlFor="campaign-url">
                                    <span>Link externo (opcional)</span>
                                    <input
                                        id="campaign-url"
                                        type="url"
                                        value={campaignDraft.externalUrl || ''}
                                        onChange={(e) =>
                                            setCampaignDraft({
                                                ...campaignDraft,
                                                externalUrl: e.target.value,
                                            })
                                        }
                                    />
                                </label>
                            </div>
                        </div>
                        <ModalActions saving={saving} close={() => setCampaignDraft(null)} />
                    </form>
                </div>
            )}
        </div>
    );
}

function PageTitle({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
    return (
        <div className="admin-page-title">
            <div>
                <span className="eyebrow">AdoCat</span>
                <h1>{title}</h1>
                <p>{text}</p>
            </div>
            {action}
        </div>
    );
}
function Stat({
    icon: Icon,
    value,
    label,
}: {
    icon: typeof PawPrint;
    value: number;
    label: string;
}) {
    return (
        <article className="stat-card">
            <div>
                <Icon />
            </div>
            <strong>{value}</strong>
            <span>{label}</span>
        </article>
    );
}
function Empty({ text }: { text: string }) {
    return (
        <div className="admin-empty">
            <PawPrint />
            <h3>{text}</h3>
            <p>Quando houver novidades, elas aparecerão aqui.</p>
        </div>
    );
}
function ModalHead({
    title,
    titleId,
    close,
}: {
    title: string;
    titleId: string;
    close: () => void;
}) {
    return (
        <header className="modal-head">
            <div>
                <span className="eyebrow">Cadastro</span>
                <h2 id={titleId}>{title}</h2>
            </div>
            <button type="button" onClick={close} aria-label="Fechar">
                <X />
            </button>
        </header>
    );
}
function ModalActions({ saving, close }: { saving: boolean; close: () => void }) {
    return (
        <footer className="modal-actions">
            <button type="button" className="button button-secondary" onClick={close}>
                Cancelar
            </button>
            <button className="button button-primary" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
            </button>
        </footer>
    );
}
function Select({
    label,
    value,
    change,
    options,
}: {
    label: string;
    value: string;
    change: (value: string) => void;
    options: readonly (readonly [string, string])[];
}) {
    const id = useId();
    return (
        <label className="field" htmlFor={id}>
            <span>{label}</span>
            <select id={id} value={value} onChange={(e) => change(e.target.value)}>
                {options.map(([v, l]) => (
                    <option key={v} value={v}>
                        {l}
                    </option>
                ))}
            </select>
        </label>
    );
}
function ApplicationTable({
    items,
    pets,
    update,
    updatingId,
}: {
    items: AdoptionApplication[];
    pets: Pet[];
    update: (id: string, status: AdoptionApplication['status']) => Promise<void>;
    updatingId: string | null;
}) {
    if (!items.length) return <Empty text="Nenhuma triagem recebida." />;
    return (
        <div className="table-scroll">
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Interessado</th>
                        <th>Animal</th>
                        <th>Moradia e rotina</th>
                        <th>Recebido em</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((a) => (
                        <tr key={a.id}>
                            <td>
                                <strong>{a.name}</strong>
                                <small>
                                    {a.email}
                                    <br />
                                    {a.phone} · {a.city}
                                </small>
                            </td>
                            <td>
                                {pets.find((p) => p.id === a.petId)?.name ||
                                    'Cadastro indisponível'}
                            </td>
                            <td>
                                <span>
                                    {a.homeType === 'house' ? 'Casa' : 'Apartamento'} ·{' '}
                                    {a.screened ? 'Protegida' : 'Proteção não confirmada'}
                                </span>
                                <small>
                                    {a.otherPets}
                                    <br />
                                    {a.routine}
                                </small>
                            </td>
                            <td>{new Date(a.createdAt).toLocaleDateString('pt-BR')}</td>
                            <td>
                                <select
                                    aria-label={`Status da candidatura de ${a.name}`}
                                    className="table-select"
                                    disabled={updatingId === a.id}
                                    value={a.status}
                                    onChange={(e) =>
                                        update(
                                            a.id,
                                            e.target.value as AdoptionApplication['status'],
                                        )
                                    }
                                >
                                    {Object.entries(adoptionStatus).map(([k, l]) => (
                                        <option key={k} value={k}>
                                            {l}
                                        </option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
