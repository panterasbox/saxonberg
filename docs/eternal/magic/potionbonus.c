/* potionbonus.c - communal snippet of code for potions */
/* death */
#define BONUS_OBJECT "/zone/null/eternal/magic/potionbonusobj.c"

status
potionbonus(object thisp, int bonus, int amount, int duration)
{
    object bonusobj;
    seteuid(getuid());
    bonusobj=clone_object(BONUS_OBJECT);
    return bonusobj->add_bonus(THISP, bonus, amount, duration);
}
