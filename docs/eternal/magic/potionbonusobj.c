/* bonus object for potions */
/* death
*/
#define PERIOD 20
object user;
int bonus_amount, bonus_duration;
string StatBonus;

add_bonus(object player, string bonus, int amount, int duration)
{
    if (!bonus || !duration || !amount || !player)
    {
	destruct(THISO);
	return;
    }
    user = player;
    StatBonus = bonus;
    bonus_amount = amount;
    bonus_duration = duration;
    call_out("decay",PERIOD);
    user->add_bonus_object(THISO);
    return 1;
}

query_stat_bonus(string arg)
{
    if(arg!=StatBonus) return;
    return(bonus_duration>0)?bonus_amount:-bonus_amount;
}

decay()
{
    if (!user) {
	destruct(THISO);
	return;
    }
    bonus_duration--;
    if (!bonus_duration) 
	tell_object(user,"You feel shaky.\n");
    if (bonus_duration < -(bonus_duration/3)) {
	user->remove_bonus_object(THISO);
	tell_object(user,"Your hands stop shaking.\n");
	destruct(THISO);
	return;
    }
    call_out("decay",PERIOD);
}
