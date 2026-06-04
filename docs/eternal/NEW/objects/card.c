/*
**  Lotto Card
**    by: Xray
*/
 
inherit ObjectCode;
 
#define THIS_FILE   "/zone/null/eternal/objects/card"
#define COST        250
#define LOG_FILE    "/zone/null/eternal/objects/lotto.log"
#define PRIZE_TIME  600
 
static int i, win, prize;
int cycle, *numbers, *winners;
object machine;
 
void set_machine(string arg) { machine=find_object((string)arg); }
 
void stamp_cycle(int n) { cycle=n; }
 
status set_number(int n)
{
    numbers += ({ n });
    return(1);
}
 
query_auto_load()
{
    string arg;
    arg=THIS_FILE;
    for (i=0;i<sizeof(numbers);i++)
        arg += ":"+numbers[i];
    arg += ":"+cycle+":"+(string)file_name(machine);
    return(arg);
}
 
init_arg(arg)
{
    string mach;
    numbers=allocate(4);
    sscanf(arg, "%d:%d:%d:%d:%d:%s", numbers[0], numbers[1], numbers[2],
        numbers[3], cycle, mach);
    set_machine((string)mach);
}        
 
int winner_check(int *num, int n)
{
    win=0;
    if (n != cycle)
        return(0);
    for (i=0;i<sizeof(numbers);i++)
        if (searcha(num,(int)numbers[i]) >= 0)
            win++;
    prize=(int)(machine->query_prize((int)win));
    if (win>2) write_file(LOG_FILE, ctime()+":"+THISP->query_name()+
        ":Matches-"+win+":Reward-"+prize+" coins:Cycle-"+cycle+".\n");
    return(win);
}
 
long()
{
    string arg1, arg2;
    if (!machine) return("a messed up lotto card\n");
    winners=machine->query_winners();
    arg1="An EotL Lotto Card\n-->";
    for (i=0;i<sizeof(numbers);i++)
        arg1 += " "+numbers[i];
    arg1 += " <--\n";
    if ((machine->query_ptime() > 0) &&
        (machine->query_ptime() < PRIZE_TIME))
    {
        arg2="Winning numbers:\n-->";
        for (i=0;i<sizeof(winners);i++)
            arg2 += " "+winners[i];
        arg2 += " <--\n";
    }
    else arg2="";
    return(arg1+arg2);
}
 
short()
{
    string arg;
    if (!machine) return("a lotto card");
    arg="a ";
    winners=machine->query_winners();
    if ((machine->query_ptime() > 0) &&
        (machine->query_ptime() < PRIZE_TIME))
    {
        if (winner_check(winners, cycle) >= 2)
            arg += "winning ";
        else arg += "losing ";
    }
    arg += "lotto card";
    return(arg);
}
 
void create()
{
    if (root()) return;
    set_name("lotto card");
    add_alias("card");
    add_alias("money");
    set_weight(0);
    set_value(COST);
    set_gettable(1);
    set_droppable(1);
    if (!pointerp(numbers)) numbers=({ });
}
