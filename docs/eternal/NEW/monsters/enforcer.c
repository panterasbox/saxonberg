/*
**  File: enforcer.c
**  Desc: basic enforcer monster
**  By Mordrick
*/

inherit MonsterCode;
inherit MonsterTalk;

void heart_beat()
{
    int i;
    object *all;

    if (!in_combat()) {
	if (environment(THISO))
        all=inventorya(environment(THISO));
	else all = ({ });
        for(i=0; i<sizeof(all); i++) {
            if ((all[i]->is_player()) && (all[i]->in_combat())) {
                tell_room(environment(THISO), "The Enforcer screams: PROTECT THE INNOCENT!! BANZAI!! ARRRRGGHHH!!!!\n");
                attack_object(all[i]);
                break;
            }
        }
    }
}
void init()
{
    ::init();
}

void ready_monster1()
{
    int size;
    object tmp;

    tmp=clone_object("/examples/armor/chain_full");
    size=random(4)+13;
    tmp->set_size(size);
    move_object(tmp, THISO);
    wear_armor(tmp);

    tmp=clone_object("/zone/fantasy/entesia/objects/armors/enforcer_tabard");
    tmp->set_size(size+1);
    move_object(tmp, THISO);
    wear_armor(tmp);

    tmp=clone_object("/examples/armor/chain_coif");
    tmp->set_size(13+random(7));
    move_object(tmp, THISO);
    wear_armor(tmp);

    tmp=clone_object("/examples/armor/leather_boots");
    tmp->set_size(13+random(7));
    move_object(tmp, THISO);
    wear_armor(tmp);
}

void ready_monster2()
{
    object tmp;

    tmp=clone_object("/examples/armor/leather_gloves");
    tmp->set_size(13+random(7));
    move_object(tmp, THISO);
    wear_armor(tmp);

    tmp=clone_object("/examples/weapon/bsword1");
    move_object(tmp, THISO);
    tmp->do_wield(tmp->query_name());

    add_money(random(30)+random(30));
}

void extra_create()
{
    int size;
    object tmp;

    set_name("enforcer");
    set_short("An Enforcer is here");
    set_long("This is an Enforcer, the law, order, and the rulers of the city\n" +
             "of Shrine.  Enforcers represent the epitome of law and neutrality.\n" +
             "In this city, they care not what the citizens and visitors do\n" +
             "as long as the sacred law is not broken.  The sacred law of Shrine\n" +
             "states that no one may raise their hand against another, within\n" +
             "city limits, no matter what the reason.  Punishment to lawbreakers\n" +
             "is usually swift and severe.\n");
    set_race("human");
    set_alignment(10);
    set_natural_ac(0);
    set_max_damage(2);
    set_hit_bonus(1);
    set_damage_bonus(1);
    set_type("blunt");
    set_offensive_level(40);
    set_defensive_level(30);
    set_aggressive(0);
    set_chat_chance(25);
    set_chat_delay(30);
    add_combat_phrase("The Enforcer screams: LAWBREAKERS MUST DIE!!!\n");
    set_heal_rate(30);
    set_heal_amount(3);
    set_stat("str", 45);
    set_stat("wil", 45);
    set_stat("int", 45);
    set_stat("dex", 45);
    set_stat("con", 45);
    set_stat("chr", 45);
    set_skill("dodge", 50);

    call_out("ready_monster1", 1);
    call_out("ready_monster2", 2);
}
