/*
**  EotL Lotto Machine
**    by: Xray
*/
 
inherit ThingCode;
 
#define LOTTO_CARD "/zone/null/eternal/objects/card"
#define COST       250
#define SAVE_FILE  "/zone/null/eternal/objects/lotto"
#define PRIZE_TIME 600
 
static string *cards, inuse;
static object me, tmp;
static int i, j, k, flag1, flag2, ptime, *winners, *num;
int cycle, jackpot, prize;
 
int query_ptime() { return(ptime); }
    
status save_lotto()
{
    save_object(SAVE_FILE);
    return(1);
}
 
int *query_winners() { return(winners); }
 
int query_prize(int n)
{
    if (n == 2) return(jackpot/33);
    if (n == 3) return(jackpot/10);
    if (n == 4) return(jackpot);
    else return(0);
}
 
status gossip(string arg)
{
    int n;
    object *list;
    string *joined, msg;
    msg=strformat(arg, "Lotto Machine gossips: ");
    list=users();
    for (n=0;n<sizeof(list);n++)
    {
        joined=({ });
        joined += 
            (string *)query_property_value(list[n], "channels_joined");
        if (searcha(joined, "GOSSIP") >= 0)
            tell_object(
                find_player(list[n]->query_real_name()), msg);
    }
    return(1);
}
 
void my_heart_beat()
{
    if (ptime <= 0)
    {
        gossip(
"Time's up!  The Lotto machine is now open for card buying again.");
        for (j=0;j<sizeof(cards);j++)
            if (find_object(cards[j]))
                destruct(find_object(cards[j]));
        cards=({ });
        winners=({ });
        inuse=0;
        cycle++;
        save_lotto();
        flag2=0;
        return;
    }
    else if (ptime == 30)
        gossip(
"You have 30 seconds to collect Lotto winnings.");
    else if (ptime == 60)
        gossip(
"You have 1 minute to collect Lotto winnings.");
    else if (((ptime/60)*60) == ptime)
        gossip(
"You have "+(ptime/60)+" minutes to collect Lotto winnings.");
    ptime--;  ptime--;
    call_out("my_heart_beat",2);
}
 
status verify_self(int n, int *m)
{
    if ((!intp(n)) || (n>15) || (n<1))
        return(0);
    for (j=0;j<sizeof(m);j++)
        if (searcha(m, n, j) >= 0)
            return(0);
    return(1);
}
 
int pick_winning_numbers()
{
    string arg;
    inuse="Game Driver";
    winners=({ });
    while(sizeof(winners)<4)
    {
        k=(random(5000)-2474);
        if (verify_self((int)(k), winners))
            winners += ({ k });
    }
    arg="The Lotto numbers have been picked.  They are:";
    for (j=0;j<sizeof(winners);j++)
        arg += " "+winners[j];
    gossip(arg);
    ptime=PRIZE_TIME;
    flag2=1;
    call_out("my_heart_beat",2);
    return(1);
}
 
status cash_in()
{
    int n;
    if (!flag2)
    {
        write("You can't cash in yet.\n");
        return(1);
    }
    me=THISP;
    tmp=present("lotto card", me);
    if (!tmp) return(0);
    inuse=capitalize(me->query_real_name());
    n=tmp->winner_check(winners, cycle);
    prize=query_prize(n);
    if ((n == 2) || (n == 3))
    {
        write(
"Your card has "+n+" winning number marked.\n"+
"You receive "+prize+" coins for your reward.\n");
        say(
inuse+" recieves "+prize+" coins for matching "+n+" Lotto numbers.\n");
        me->add_money(prize);
        jackpot -= (prize);
    }
    else if (n == 4)
    {
        write(
"JACKPOT!!!  You win the Lottery!\n"+
"You receive "+prize+" coins for your incredible luck.\n");
        say(
inuse+" hit the JACKPOT!!!  "+capitalize((string)subjective(me))+
" recieves "+prize+" coins for "+possessive(me)+" incredible luck.\n");
        gossip(
"The EotL Lotto Jackpot has been claimed!!!");
        gossip(
inuse+" takes home "+prize+" coins for "+possessive(me)+" luck.");
        me->add_money(prize);
        jackpot=0;
        ptime=0;
    }
    else
    {
        write(
"This isn't a winning Lotto card!\n");
        say(
inuse+" tries to claim Lotto winnings on a losing card.\n");
    }
    inuse="Game Driver";
    me->save_me(); /* (me) doesn't get card value in case of crash */
    return(destruct(tmp));
}
    
string cant_play()
{
    return("The EotL Lotto Machine is in use.  Try again when "+
        inuse+" is done with it.\n");
}
 
status verify(string arg)
{
    int n;
    if (sscanf(arg, "%d", n) != 1)
    {
        write("Numbers, I said!  Numbers!  (1 - 15)\n");
        return(0);
    }
    if ((n>15) || (n<1))
    {
        write("Numbers must be from 1 to 15.\n");
        return(0);
    }
    if (searcha(num, n) >= 0)
    {
        write("You may only pick each number once.\n");
        return(0);
    }
    num[i]=n;
    return(1);
}
 
int buy_card()
{
    if (stringp(inuse))
    {
        write(THISO->cant_play());
        return(1);
    }
    num=allocate(4);
    i=0;
    me=THISP;
    inuse=capitalize(me->query_real_name());
    if (me->query_money()<COST)
    {
        write("You don't have enough money to play Lotto!\n");
        say(inuse+" didn't have the "+COST+
            " coins needed to play Lotto.\n");
        inuse=0;
        return(1);
    }
    say(inuse+" puts "+COST+" coins in the EotL Lotto Machine.\n");
    me->add_money(-COST);
    tmp=clone_object(LOTTO_CARD);
    write("Pick 4 numbers.  (1 to 15)\nNumber "+(i+1)+": ");
    input_to("choose_em");
    return(1);
}
 
choose_em(int n)
{
    if (!verify(n))
    {
        write("Number "+(i+1)+": ");
        input_to("choose_em");
        return(1);
    }
    tmp->set_number(n);
    i++;
    if (i == 4)
    {
        write("4 numbers picked.  Here's your lotto card!\n");
        say(inuse+" receives an EotL Lotto Card.\n");
        tmp->stamp_cycle(cycle);
        tmp->set_machine(file_name(THISO));
        move_object(tmp, me);
        jackpot += COST;
        if (!pointerp(cards)) cards=({ });
        cards += file_name(tmp);
        inuse=0;
        return(1);
    }
    write("Number "+(i+1)+": ");
    input_to("choose_em");
    return(1);
}
 
void reset(int n)
{
    if (root()) return;
    if (!flag1)
    {
        gossip(
"Lotto numbers will be drawn in about 30 minutes."+
"  Buy a card or two in the lounge!");
        flag1=1;
    }
    else
    {
        gossip(
"EotL Lotto numbers are being chosen . . . ");
        pick_winning_numbers();
        flag1=0;
    }
}
 
void init()
{
    add_action("buy_card","lotto");
    add_action("cash_in","jackpot");
}
 
long()
{
    return(
"Lotto is a simple game.  Pick 4 numbers, from 1 to 15.  When the winning\n"+
"numbers are drawn (every other reset), claim your cash prize if at least\n"+
"2 of your numbers match the winning numbers.  Stay tuned to the gossip\n"+
"channel to see when the winning numbers are drawn.     Binford [tm]\n"+
"Commands:\n"+
"\tlotto\t\tPlay Lotto ("+COST+" coins)\n"+
"\tjackpot\t\tCash in on a winning ticket\n"+
"Prizes:\n"+
"\t2 Matches:\t"+query_prize(2)+"\n"+
"\t3 Matches:\t"+query_prize(3)+"\n"+
"\tJackpot:\t"+jackpot+"\n");
}
 
void create()
{
    if (root()) return;
    seteuid(getuid());
    if (!restore_object(SAVE_FILE))
    {
        set_name("lotto machine");
        add_alias("lotto");
        set_short("The EotL Lotto Machine");
        jackpot=0;
        cycle=0;
    }
}
